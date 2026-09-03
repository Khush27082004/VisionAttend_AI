import { Router } from "express";
import prisma from "../prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authorize } from "../middleware/role.middleware";
import { authenticate, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

router.get("/profile", authenticate, authorize("ADMIN"), (req: AuthRequest, res) => {
  res.json({
    message: "Welcome Admin",
    user: req.user
  });
});

// Login
router.post("/login", async (req, res) => {
  try {
    const email = (req.body.email || "").toString().toLowerCase().trim();
    const password = (req.body.password || "").toString().trim();

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide both email and password." });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const jwtSecret = process.env.JWT_SECRET || "visionattend_secret_key_123!";
    const token = jwt.sign(
      { id: user.id, role: user.role },
      jwtSecret,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login Successful",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error during login." });
  }
});

// Student Registration
router.post("/register", async (req, res) => {
  try {
    const fullName = (req.body.fullName || "").toString().trim();
    const email = (req.body.email || "").toString().toLowerCase().trim();
    const password = (req.body.password || "").toString().trim();
    const enrollmentNo = (req.body.enrollmentNo || "").toString().toUpperCase().trim();
    const department = (req.body.department || "").toString().trim();
    const semester = Number(req.body.semester);
    const division = (req.body.division || "").toString().toUpperCase().trim();
    const phone = req.body.phone ? req.body.phone.toString().trim() : null;

    if (!fullName || !email || !password || !enrollmentNo || !department || !semester || !division) {
      return res.status(400).json({ message: "All required fields must be filled." });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    const existingStudent = await prisma.student.findUnique({ where: { enrollmentNo } });
    if (existingStudent) {
      return res.status(400).json({ message: "Enrollment number is already registered." });
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
        userId: user.id,
        enrollmentNo,
        department,
        semester,
        division,
        phone
      }
    });

    const jwtSecret = process.env.JWT_SECRET || "visionattend_secret_key_123!";
    const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: "1d" });

    return res.status(201).json({
      message: "Registration successful!",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      },
      student
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error during registration." });
  }
});

// Create First Admin
router.post("/create-admin", async (req, res) => {
  try {
    const { fullName, password } = req.body;
    const email = (req.body.email || "").toString().toLowerCase().trim();

    const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role: "ADMIN"
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    return res.status(201).json({ message: "Admin created successfully", admin });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;