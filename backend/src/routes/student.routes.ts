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
