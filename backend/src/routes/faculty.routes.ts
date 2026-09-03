import { Router } from "express";
import prisma from "../prisma";
import bcrypt from "bcrypt";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      employeeId,
      department,
      designation,
    } = req.body;

    if (!fullName || !email || !password || !employeeId || !department) {
      return res.status(400).json({ message: "All required fields must be filled." });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role: "FACULTY",
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        employeeId,
        department,
        designation: designation || null,
        userId: user.id,
      },
    });

    res.json(faculty);
  } catch (error) {
    console.error("Error creating faculty:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const faculty = await prisma.faculty.findMany({
      include: {
        user: true,
      },
    });

    res.json(faculty);
  } catch (error) {
    console.error("Error fetching faculty:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;