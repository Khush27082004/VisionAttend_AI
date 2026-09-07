import { Router } from "express";
import prisma from "../prisma";
import { authenticate, AuthRequest } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

// 1. Verify Enrollment No. for Student Registration (Public)
router.get("/verify/:enrollmentNo", async (req, res) => {
  try {
    const rawEnrollment = req.params.enrollmentNo || "";
    const enrollmentNo = rawEnrollment.toString().toUpperCase().trim();

    if (!enrollmentNo) {
      return res.status(400).json({ valid: false, message: "Enrollment number is required." });
    }

    // Check if total count of roster entries is 0 (if system has no roster seeded yet)
    const rosterCount = await prisma.masterStudentRoster.count();
    if (rosterCount === 0) {
      // If no master roster has been added by admin yet, allow open registration mode
      return res.json({
        valid: true,
        isRosterEmpty: true,
        message: "No master roster restrictions active yet. Open registration allowed.",
        data: null
      });
    }

    // Check if enrollment number is in the Master Roster
    const rosterEntry = await prisma.masterStudentRoster.findUnique({
      where: { enrollmentNo }
    });

    if (!rosterEntry) {
      return res.status(404).json({
        valid: false,
        message: `Enrollment number "${enrollmentNo}" was not found in the University Master Roster. Please contact your Department Admin.`
      });
    }

    // Check if already claimed / registered in Student table
    const existingStudent = await prisma.student.findUnique({
      where: { enrollmentNo }
    });

    if (existingStudent || rosterEntry.isClaimed) {
      return res.status(409).json({
        valid: false,
        claimed: true,
        message: `Enrollment number "${enrollmentNo}" is already registered. Please login to your account.`
      });
    }

    // Valid and unclaimed
    return res.json({
      valid: true,
      claimed: false,
      message: "Enrollment verified successfully! Department and academic details locked.",
      data: {
        enrollmentNo: rosterEntry.enrollmentNo,
        fullName: rosterEntry.fullName,
        department: rosterEntry.department,
        semester: rosterEntry.semester,
        division: rosterEntry.division,
        email: rosterEntry.email || null
      }
    });
  } catch (error) {
    console.error("Error verifying enrollment:", error);
    return res.status(500).json({ valid: false, message: "Server error verifying enrollment number." });
  }
});

// 2. Get All Master Roster Entries (Admin)
router.get("/", authenticate, authorize("ADMIN"), async (req: AuthRequest, res) => {
  try {
    const department = req.query.department as string;
    const semester = req.query.semester ? Number(req.query.semester) : undefined;
    const isClaimedStr = req.query.claimed as string;

    const where: any = {};
    if (department) where.department = department;
    if (semester) where.semester = semester;
    if (isClaimedStr === "true") where.isClaimed = true;
    if (isClaimedStr === "false") where.isClaimed = false;

    const roster = await prisma.masterStudentRoster.findMany({
      where,
      orderBy: [{ department: "asc" }, { semester: "asc" }, { enrollmentNo: "asc" }]
    });

    const totalCount = await prisma.masterStudentRoster.count();
    const claimedCount = await prisma.masterStudentRoster.count({ where: { isClaimed: true } });
    const pendingCount = totalCount - claimedCount;

    return res.json({
      roster,
      stats: {
        total: totalCount,
        claimed: claimedCount,
        pending: pendingCount
      }
    });
  } catch (error) {
    console.error("Error fetching master roster:", error);
    return res.status(500).json({ message: "Could not fetch master student roster." });
  }
});

// 3. Add Single Student to Master Roster (Admin)
router.post("/", authenticate, authorize("ADMIN"), async (req: AuthRequest, res) => {
  try {
    const enrollmentNo = (req.body.enrollmentNo || "").toString().toUpperCase().trim();
    const fullName = (req.body.fullName || "").toString().trim();
    const department = (req.body.department || "").toString().trim();
    const semester = Number(req.body.semester);
    const division = (req.body.division || "A").toString().toUpperCase().trim();
    const email = req.body.email ? req.body.email.toString().toLowerCase().trim() : null;

    if (!enrollmentNo || !fullName || !department || !semester || !division) {
      return res.status(400).json({ message: "Enrollment number, Full Name, Department, Semester and Division are required." });
    }

    const existing = await prisma.masterStudentRoster.findUnique({
      where: { enrollmentNo }
    });
    if (existing) {
      return res.status(400).json({ message: `Student with enrollment "${enrollmentNo}" already exists in Master Roster.` });
    }

    // Check if already registered as active student
    const activeStudent = await prisma.student.findUnique({
      where: { enrollmentNo }
    });

    const newEntry = await prisma.masterStudentRoster.create({
      data: {
        enrollmentNo,
        fullName,
        department,
        semester,
        division,
        email,
        isClaimed: !!activeStudent
      }
    });

    return res.status(201).json({
      message: "Student added to Master Roster successfully!",
      student: newEntry
    });
  } catch (error) {
    console.error("Error adding to master roster:", error);
    return res.status(500).json({ message: "Could not add student to master roster." });
  }
});

// 4. Bulk Import / Add Students to Master Roster (Admin)
router.post("/bulk", authenticate, authorize("ADMIN"), async (req: AuthRequest, res) => {
  try {
    const students: any[] = req.body.students || [];
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: "A non-empty list of students is required." });
    }

    let addedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const item of students) {
      const enrollmentNo = (item.enrollmentNo || "").toString().toUpperCase().trim();
      const fullName = (item.fullName || "").toString().trim();
      const department = (item.department || "").toString().trim();
      const semester = Number(item.semester);
      const division = (item.division || "A").toString().toUpperCase().trim();
      const email = item.email ? item.email.toString().toLowerCase().trim() : null;

      if (!enrollmentNo || !fullName || !department || !semester) {
        skippedCount++;
        continue;
      }

      try {
        const existing = await prisma.masterStudentRoster.findUnique({ where: { enrollmentNo } });
        if (existing) {
          skippedCount++;
          continue;
        }

        const activeStudent = await prisma.student.findUnique({ where: { enrollmentNo } });

        await prisma.masterStudentRoster.create({
          data: {
            enrollmentNo,
            fullName,
            department,
            semester,
            division,
            email,
            isClaimed: !!activeStudent
          }
        });
        addedCount++;
      } catch (err: any) {
        errors.push(`Failed to insert ${enrollmentNo}: ${err.message}`);
      }
    }

    return res.json({
      message: `Bulk import completed: ${addedCount} student(s) added, ${skippedCount} skipped (duplicates/invalid).`,
      addedCount,
      skippedCount,
      errors
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return res.status(500).json({ message: "Error performing bulk roster import." });
  }
});

// 5. Delete Entry from Master Roster (Admin)
router.delete("/:id", authenticate, authorize("ADMIN"), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid roster entry ID" });
    }

    await prisma.masterStudentRoster.delete({
      where: { id }
    });

    return res.json({ message: "Roster entry removed successfully." });
  } catch (error) {
    console.error("Error deleting roster entry:", error);
    return res.status(500).json({ message: "Could not remove roster entry." });
  }
});

// 6. Auto-Sync all existing registered students into Master Roster
router.post("/sync-existing", authenticate, authorize("ADMIN"), async (req: AuthRequest, res) => {
  try {
    const existingStudents = await prisma.student.findMany({
      include: { user: true }
    });

    let syncedCount = 0;
    for (const st of existingStudents) {
      const existing = await prisma.masterStudentRoster.findUnique({
        where: { enrollmentNo: st.enrollmentNo }
      });
      if (!existing) {
        await prisma.masterStudentRoster.create({
          data: {
            enrollmentNo: st.enrollmentNo,
            fullName: st.user.fullName,
            department: st.department,
            semester: st.semester,
            division: st.division,
            email: st.user.email,
            isClaimed: true
          }
        });
        syncedCount++;
      } else if (!existing.isClaimed) {
        await prisma.masterStudentRoster.update({
          where: { id: existing.id },
          data: { isClaimed: true }
        });
      }
    }

    return res.json({
      message: `Sync completed: ${syncedCount} existing student(s) synchronized into Master Roster.`
    });
  } catch (error) {
    console.error("Error syncing existing students:", error);
    return res.status(500).json({ message: "Failed to sync existing students." });
  }
});

export default router;
