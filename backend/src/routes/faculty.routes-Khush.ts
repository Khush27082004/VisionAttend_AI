import { Router } from "express";
import prisma from "../prisma";
import bcrypt from "bcrypt";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const Role = {
  ADMIN: "ADMIN",
  FACULTY: "FACULTY",
  STUDENT: "STUDENT"
};

const router = Router();

router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  const {
    fullName,
    email,
    password,
    employeeId,
    department,
    designation,
  } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      password: hashedPassword,
      role: Role.FACULTY,
    },
  });

  const faculty = await prisma.faculty.create({
    data: {
      employeeId,
      department,
      designation,
      userId: user.id,
    },
  });

  res.json(faculty);
});

router.get("/", authenticate, authorize("ADMIN"), async (req, res) => {
  const faculty = await prisma.faculty.findMany({
    include: {
      user: true,
    },
  });

  res.json(faculty);
});

export default router;