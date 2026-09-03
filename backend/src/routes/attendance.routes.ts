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
        subject: { select: { name: true } },
        faculty: { select: { user: { select: { fullName: true } } } }
      }
    });

    return res.json(attendance.map(record => ({
      id: record.id,
      subjectName: record.subject.name,
      date: record.date,
      status: record.status,
      facultyName: record.faculty.user.fullName
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

    if (!Number.isInteger(studentId) || !Number.isInteger(subjectId)) {
      return res.status(400).json({ success: false, message: "studentId and subjectId are required" });
    }

    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) {
      return res.status(403).json({ success: false, message: "Faculty profile not found" });
    }

    const subject = await prisma.subject.findFirst({ where: { id: subjectId, facultyId: faculty.id } });
    if (!subject) {
      return res.status(403).json({ success: false, message: "You cannot mark attendance for this subject" });
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
        // Construct in local server time rather than UTC zero-hour
        classDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
      } else {
        classDate = new Date(customDateStr);
      }
      // Apply current server hour, minute, second to custom date to log marking time
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
        facultyId: faculty.id,
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

    const attendance = await prisma.attendance.findMany({
      where: { facultyId: faculty.id },
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
      division: a.student.division
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load all attendance records" });
  }
});

router.get("/subject/:subjectId", authenticate, authorize("FACULTY"), async (req: AuthRequest, res) => {
  try {
    const subjectId = Number(req.params.subjectId);
    if (!Number.isInteger(subjectId)) {
      return res.status(400).json({ message: "Invalid subject ID" });
    }

    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) {
      return res.status(403).json({ message: "Faculty profile not found" });
    }

    const subject = await prisma.subject.findFirst({ where: { id: subjectId, facultyId: faculty.id } });
    if (!subject) {
      return res.status(403).json({ message: "You do not teach this subject" });
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
      division: a.student.division
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

router.delete("/subject/:subjectId/today", authenticate, authorize("FACULTY"), async (req: AuthRequest, res) => {
  try {
    const subjectId = Number(req.params.subjectId);
    if (!Number.isInteger(subjectId)) {
      return res.status(400).json({ success: false, message: "Invalid subject ID" });
    }

    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) {
      return res.status(403).json({ success: false, message: "Faculty profile not found" });
    }

    const subject = await prisma.subject.findFirst({ where: { id: subjectId, facultyId: faculty.id } });
    if (!subject) {
      return res.status(403).json({ success: false, message: "You do not teach this subject" });
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
