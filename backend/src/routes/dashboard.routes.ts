import { Router } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

router.get("/stats", authenticate, async (req, res) => {
  try {
    const totalStudents = await prisma.student.count();
    const totalFaculty = await prisma.faculty.count();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaysAttendanceCount = await prisma.attendance.count({
      where: {
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    const attendanceRate = totalStudents > 0 
      ? Math.round((todaysAttendanceCount / totalStudents) * 100) 
      : 0;

    // Get recent attendance logs (latest 5 logs)
    const recentLogs = await prisma.attendance.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: {
        student: {
          include: {
            user: { select: { fullName: true } }
          }
        },
        subject: { select: { name: true } }
      }
    });

    // Get subjects (classes) list to show real courses
    const subjectsList = await prisma.subject.findMany({
      take: 4,
      include: {
        faculty: {
          include: {
            user: { select: { fullName: true } }
          }
        }
      }
    });

    return res.json({
      totalStudents,
      totalFaculty,
      todaysAttendance: todaysAttendanceCount,
      attendanceRate,
      recentLogs: recentLogs.map(log => ({
        id: log.id,
        studentName: log.student.user.fullName,
        subjectName: log.subject.name,
        time: log.date,
        status: log.status
      })),
      classes: subjectsList.map((sub, index) => {
        const rooms = ["Room 301", "Room 205", "Lab 01", "Seminar Hall"];
        const times = ["09:00 - 10:00", "10:30 - 11:30", "12:00 - 01:00", "02:00 - 03:30"];
        return {
          id: sub.id,
          name: sub.name,
          department: sub.department,
          semester: sub.semester,
          facultyName: sub.faculty.user.fullName,
          room: rooms[index % rooms.length],
          time: times[index % times.length]
        };
      })
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load dashboard statistics" });
  }
});

// Admin command: delete all students & their user accounts
router.delete("/reset/students", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    await prisma.attendance.deleteMany();
    await prisma.student.deleteMany();
    await prisma.user.deleteMany({ where: { role: "STUDENT" } });
    return res.json({ success: true, message: "All student records and user credentials successfully deleted." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not delete student records." });
  }
});

// Admin command: delete all faculty, subjects, & their user accounts
router.delete("/reset/faculty", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    await prisma.attendance.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.user.deleteMany({ where: { role: "FACULTY" } });
    return res.json({ success: true, message: "All faculty members, subjects, and user credentials successfully deleted." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not delete faculty records." });
  }
});

// Admin command: reset entire database (wipe all tables except Admin users)
router.delete("/reset/all", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    await prisma.attendance.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.student.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.user.deleteMany({ where: { role: { not: "ADMIN" } } });
    return res.json({ success: true, message: "Entire database successfully reset (excluding Administrators)." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not reset database." });
  }
});

export default router;
