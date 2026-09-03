import { Router } from "express";
import prisma from "../prisma";
import { authenticate, AuthRequest } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

router.post("/", authenticate, authorize("ADMIN", "FACULTY"), async (req: AuthRequest, res) => {
  try {
    const { name, department, semester } = req.body;
    let facultyId = req.body.facultyId;

    if (req.user!.role === "FACULTY") {
      const faculty = await prisma.faculty.findUnique({
        where: { userId: req.user!.id }
      });
      if (!faculty) {
        return res.status(403).json({ message: "Faculty profile not found" });
      }
      facultyId = faculty.id;
    } else {
      facultyId = Number(facultyId);
    }

    if (!name || !department || !semester || !facultyId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        department,
        semester: Number(semester),
        facultyId,
      },
    });

    res.json(subject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user!.role;
    let whereClause = {};

    if (userRole === "FACULTY") {
      const faculty = await prisma.faculty.findUnique({
        where: { userId: req.user!.id }
      });
      if (!faculty) {
        return res.status(403).json({ message: "Faculty profile not found" });
      }
      whereClause = { facultyId: faculty.id };
    }

    const subjects = await prisma.subject.findMany({
      where: whereClause,
      include: {
        faculty: {
          include: {
            user: true,
          },
        },
      },
    });

    res.json(subjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id/students", authenticate, async (req, res) => {
  try {
    const subjectId = Number(req.params.id);
    if (!Number.isInteger(subjectId)) {
      return res.status(400).json({ message: "Invalid subject ID" });
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const students = await prisma.student.findMany({
      where: {
        department: subject.department,
        semester: subject.semester
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    });

    res.json(students.map(s => ({
      id: s.id,
      fullName: s.user.fullName,
      enrollmentNo: s.enrollmentNo,
      department: s.department,
      semester: s.semester,
      division: s.division
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", authenticate, authorize("ADMIN", "FACULTY"), async (req: AuthRequest, res) => {
  try {
    const subjectId = Number(req.params.id);
    if (!Number.isInteger(subjectId)) {
      return res.status(400).json({ message: "Invalid subject ID" });
    }

    if (req.user!.role === "FACULTY") {
      const faculty = await prisma.faculty.findUnique({
        where: { userId: req.user!.id }
      });
      if (!faculty) {
        return res.status(403).json({ message: "Faculty profile not found" });
      }
      const subject = await prisma.subject.findFirst({
        where: { id: subjectId, facultyId: faculty.id }
      });
      if (!subject) {
        return res.status(403).json({ message: "You cannot delete this subject" });
      }
    }

    // Cascade delete associated attendance records first
    await prisma.attendance.deleteMany({
      where: { subjectId }
    });

    await prisma.subject.delete({
      where: { id: subjectId }
    });

    res.json({ success: true, message: "Subject deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;