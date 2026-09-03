import { Router } from "express";
import prisma from "../prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authorize } from "../middleware/role.middleware";

import { authenticate, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

router.get(
  "/profile",
  authenticate,
  authorize("ADMIN"),
  (req: AuthRequest, res) => {

    res.json({
      message: "Welcome Admin",
      user: req.user
    });

});

// Register Student
router.post("/register", async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      enrollmentNo,
      department,
      semester,
      division,
      phone
    } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const existingStudent = await prisma.student.findUnique({ where: { enrollmentNo } });
    if (existingStudent) {
      return res.status(400).json({ message: "Enrollment number already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role: "STUDENT"
      }
    });

    const student = await prisma.student.create({
      data: {
        enrollmentNo,
        department,
        semester: Number(semester),
        division,
        phone,
        userId: user.id
      }
    });

    res.status(201).json({
      message: "Registration Successful",
      student
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  return res.status(500).json({
    message: "JWT_SECRET is not configured",
  });
}

const token = jwt.sign(
  {
    id: user.id,
    role: user.role,
  },
  jwtSecret,
  {
    expiresIn: "1d",
  }
);

    res.json({
      message: "Login Successful",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});



// Create First Admin
router.post("/create-admin", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      return res.status(400).json({
        message: "Admin already exists",
      });
    }

    // Check email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role: "ADMIN",
      },

      select: {
    id: true,
    fullName: true,
    email: true,
    role: true,
    isActive: true,
    createdAt: true,
  },

    });

    res.status(201).json({
      message: "Admin created successfully",
      admin,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

export default router;