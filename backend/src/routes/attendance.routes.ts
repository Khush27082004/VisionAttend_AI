import { Router } from "express";
import prisma from "../prisma";
import { authenticate, AuthRequest } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

router.get("/my", authenticate, authorize("STUDENT"), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const attendance = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        status: true,
        isProxy: true,
        proxyNotes: true,
        subject: { select: { name: true } },
        faculty: { select: { user: { select: { fullName: true } } } },
        proxyFaculty: { select: { user: { select: { fullName: true } } } }
      }
    });

    return res.json(attendance.map(record => ({
      id: record.id,
      subjectName: record.subject.name,
      date: record.date,
      status: record.status,
      facultyName: record.faculty.user.fullName,
      isProxy: record.isProxy,
      proxyNotes: record.proxyNotes,
      proxyFacultyName: record.proxyFaculty?.user?.fullName || null
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load attendance" });
  }
});

router.post("/", authenticate, authorize("FACULTY"), async (req: AuthRequest, res) => {
  try {
    const studentId = Number(req.body.studentId);
    const subjectId = Number(req.body.subjectId);
    const customDateStr = req.body.date;
    const isProxy = Boolean(req.body.isProxy);
    const proxyNotes = req.body.proxyNotes ? String(req.body.proxyNotes).trim() : null;

    if (!Number.isInteger(studentId) || !Number.isInteger(subjectId)) {
      return res.status(400).json({ success: false, message: "studentId and subjectId are required" });
    }

    const currentFaculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!currentFaculty) {
      return res.status(403).json({ success: false, message: "Faculty profile not found" });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { faculty: { include: { user: true } } }
    });
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    // If not proxy mode, verify faculty owns the subject
    if (!isProxy && subject.facultyId !== currentFaculty.id) {
      return res.status(403).json({ success: false, message: "You cannot mark attendance for this subject without proxy mode enabled" });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ success: false, message: "Recognized student no longer exists" });
    }

    const now = new Date();
    let classDate = now;
    if (customDateStr) {
      const dateParts = customDateStr.split('-');
      if (dateParts.length === 3) {
        classDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
      } else {
        classDate = new Date(customDateStr);
      }
      classDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }

    const startOfDay = new Date(classDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(startOfDay.getDate() + 1);

    const exists = await prisma.attendance.findFirst({
      where: {
        studentId,
        subjectId,
        date: { gte: startOfDay, lt: endOfDay }
      }
    });
    if (exists) {
      return res.json({ success: false, message: "Attendance already marked for this date" });
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentId,
        subjectId,
        facultyId: subject.facultyId, // Assigned to the subject owner so it directly appears in absent faculty's records!
        proxyFacultyId: isProxy ? currentFaculty.id : null,
        isProxy: isProxy,
        proxyNotes: isProxy ? proxyNotes : null,
        status: "Present",
        date: classDate
      }
    });
    return res.status(201).json({ success: true, attendance });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not mark attendance" });
  }
});

router.get("/faculty/all", authenticate, authorize("FACULTY"), async (req: AuthRequest, res) => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) {
      return res.status(404).json({ message: "Faculty profile not found" });
    }

    const view = req.query.view as string; // 'all' | 'mine' | 'proxy_conducted' | 'proxy_received'
    let whereClause: any = {
      OR: [
        { facultyId: faculty.id },
        { proxyFacultyId: faculty.id }
      ]
    };

    if (view === "mine") {
      whereClause = { facultyId: faculty.id, isProxy: false };
    } else if (view === "proxy_conducted") {
      whereClause = { proxyFacultyId: faculty.id, isProxy: true };
    } else if (view === "proxy_received") {
      whereClause = { facultyId: faculty.id, isProxy: true };
    }

    const attendance = await prisma.attendance.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      include: {
        student: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true
              }
            }
          }
        },
        subject: {
          select: {
            name: true
          }
        },
        faculty: {
          select: {
            user: {
              select: {
                fullName: true
              }
            }
          }
        },
        proxyFaculty: {
          select: {
            user: {
              select: {
                fullName: true
              }
            }
          }
        }
      }
    });

    return res.json(attendance.map(a => ({
      id: a.id,
      date: a.date,
      status: a.status,
      subjectName: a.subject.name,
      studentName: a.student.user.fullName,
      enrollmentNo: a.student.enrollmentNo,
      department: a.student.department,
      semester: a.student.semester,
      division: a.student.division,
      isProxy: a.isProxy,
      proxyNotes: a.proxyNotes,
      primaryFacultyName: a.faculty?.user?.fullName,
      proxyFacultyName: a.proxyFaculty?.user?.fullName,
      isProxyConductedByMe: a.proxyFacultyId === faculty.id,
      isProxyReceivedForMe: a.facultyId === faculty.id && a.isProxy
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load all attendance records" });
  }
});

router.get("/subject/:subjectId", authenticate, authorize("FACULTY", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const subjectId = Number(req.params.subjectId);
    if (!Number.isInteger(subjectId)) {
      return res.status(400).json({ message: "Invalid subject ID" });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { faculty: { include: { user: true } } }
    });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const queryDateStr = req.query.date as string;
    const whereClause: any = { subjectId };

    if (queryDateStr) {
      let classDate: Date;
      const dateParts = queryDateStr.split('-');
      if (dateParts.length === 3) {
        classDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
      } else {
        classDate = new Date(queryDateStr);
      }
      const startOfDay = new Date(classDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(startOfDay.getDate() + 1);
      whereClause.date = { gte: startOfDay, lt: endOfDay };
    }

    const attendance = await prisma.attendance.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      include: {
        student: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true
              }
            }
          }
        },
        faculty: {
          select: {
            user: { select: { fullName: true } }
          }
        },
        proxyFaculty: {
          select: {
            user: { select: { fullName: true } }
          }
        }
      }
    });

    return res.json(attendance.map(a => ({
      id: a.id,
      date: a.date,
      status: a.status,
      studentName: a.student.user.fullName,
      enrollmentNo: a.student.enrollmentNo,
      department: a.student.department,
      semester: a.student.semester,
      division: a.student.division,
      isProxy: a.isProxy,
      proxyNotes: a.proxyNotes,
      primaryFacultyName: a.faculty?.user?.fullName,
      proxyFacultyName: a.proxyFaculty?.user?.fullName
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load attendance" });
  }
});

router.delete("/all", authenticate, authorize("ADMIN"), async (req: AuthRequest, res) => {
  try {
    await prisma.attendance.deleteMany();
    return res.json({ success: true, message: "All attendance records have been cleared successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not clear attendance records." });
  }
});

router.delete("/subject/:subjectId/today", authenticate, authorize("FACULTY", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const subjectId = Number(req.params.subjectId);
    if (!Number.isInteger(subjectId)) {
      return res.status(400).json({ success: false, message: "Invalid subject ID" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const deleteResult = await prisma.attendance.deleteMany({
      where: {
        subjectId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    return res.json({ success: true, count: deleteResult.count, message: `Successfully cleared ${deleteResult.count} record(s) for today's session.` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not reset today's attendance logs" });
  }
});

export default router;
