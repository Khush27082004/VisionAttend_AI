import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { createStudent, getAllStudents } from "./student.controller";
import prisma from "../prisma";

const router = Router();

router.post("/", authenticate, authorize("ADMIN"), createStudent);
router.get("/", authenticate, authorize("ADMIN"), getAllStudents);

router.get("/profile", authenticate, authorize("STUDENT"), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
      include: { user: true }
    });
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }
    return res.json(student);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/dashboard-summary", authenticate, authorize("STUDENT"), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
      include: { user: true }
    });
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    // 1. Get subjects for student's department and semester
    const subjects = await prisma.subject.findMany({
      where: {
        department: student.department,
        semester: student.semester
      },
      include: {
        faculty: {
          include: {
            user: { select: { fullName: true } }
          }
        }
      }
    });

    // 2. Fetch all attendance records for this student
    const studentAttendanceRecords = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: "desc" },
      include: {
        subject: { select: { id: true, name: true } },
        faculty: { select: { user: { select: { fullName: true } } } },
        proxyFaculty: { select: { user: { select: { fullName: true } } } }
      }
    });

    // 3. For each subject, compute total conducted lectures and student's attended count
    let totalLecturesAllSubjects = 0;
    let totalAttendedAllSubjects = 0;

    const subjectSummaries = await Promise.all(subjects.map(async (subj) => {
      const allSubjLogs = await prisma.attendance.findMany({
        where: { subjectId: subj.id },
        select: { date: true }
      });
      const uniqueDays = new Set(allSubjLogs.map(l => new Date(l.date).toISOString().split('T')[0]));
      const totalConducted = uniqueDays.size;

      const attended = studentAttendanceRecords.filter(r => r.subjectId === subj.id).length;
      const absent = Math.max(0, totalConducted - attended);
      const percentage = totalConducted > 0 ? Number(((attended / totalConducted) * 100).toFixed(1)) : 0;
      const isDefaulter = totalConducted > 0 && percentage < 75.0;

      totalLecturesAllSubjects += totalConducted;
      totalAttendedAllSubjects += attended;

      return {
        id: subj.id,
        name: subj.name,
        department: subj.department,
        semester: subj.semester,
        facultyName: subj.faculty?.user?.fullName || "Faculty Instructor",
        totalConducted,
        attended,
        absent,
        percentage,
        isDefaulter,
        status: totalConducted === 0 ? "NO_CLASSES" : isDefaulter ? "DEFICIENT" : "NORMAL"
      };
    }));

    const totalAbsentAll = Math.max(0, totalLecturesAllSubjects - totalAttendedAllSubjects);
    const overallPercentage = totalLecturesAllSubjects > 0
      ? Number(((totalAttendedAllSubjects / totalLecturesAllSubjects) * 100).toFixed(1))
      : 0;
    const isEligible = totalLecturesAllSubjects === 0 || overallPercentage >= 75.0;

    // 4. Format recent activity
    const recentActivity = studentAttendanceRecords.slice(0, 15).map(r => ({
      id: r.id,
      date: r.date,
      status: r.status,
      subjectName: r.subject.name,
      facultyName: r.faculty.user.fullName,
      isProxy: r.isProxy,
      proxyNotes: r.proxyNotes,
      proxyFacultyName: r.proxyFaculty?.user?.fullName || null
    }));

    return res.json({
      student: {
        id: student.id,
        enrollmentNo: student.enrollmentNo,
        department: student.department,
        semester: student.semester,
        division: student.division,
        phone: student.phone,
        faceRegistered: student.faceRegistered,
        fullName: student.user.fullName,
        email: student.user.email,
        createdAt: student.user.createdAt
      },
      stats: {
        totalSubjects: subjects.length,
        totalLectures: totalLecturesAllSubjects,
        attendedLectures: totalAttendedAllSubjects,
        absentLectures: totalAbsentAll,
        overallPercentage,
        isEligible,
        statusText: isEligible ? "ELIGIBLE FOR EXAMS (≥ 75%)" : "ATTENDANCE DEFICIENT (< 75%)"
      },
      subjects: subjectSummaries,
      recentActivity
    });
  } catch (error) {
    console.error("Error loading student dashboard summary:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id/face-registered", authenticate, authorize("ADMIN", "STUDENT"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Invalid student ID" });
  }

  if (req.user!.role === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student || student.id !== id) {
      return res.status(403).json({ message: "Unauthorized to update this profile" });
    }
  }

  try {
    const student = await prisma.student.update({ where: { id }, data: { faceRegistered: true } });
    return res.json(student);
  } catch {
    return res.status(404).json({ message: "Student not found" });
  }
});

export default router;
