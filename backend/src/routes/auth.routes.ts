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
    const rawIdentifier = (req.body.email || req.body.identifier || "").toString().trim();
    const password = (req.body.password || "").toString().trim();

    if (!rawIdentifier || !password) {
      return res.status(400).json({ message: "Please provide your email or enrollment number and password." });
    }

    // 1. Try finding user by email (case-insensitive)
    let user = await prisma.user.findUnique({
      where: { email: rawIdentifier.toLowerCase() }
    });

    // 2. If not found by email, check if it's a student logging in with their enrollment number
    if (!user) {
      const student = await prisma.student.findUnique({
        where: { enrollmentNo: rawIdentifier.toUpperCase() },
        include: { user: true }
      });
      if (student && student.user) {
        user = student.user;
      }
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid email/enrollment number or password." });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email/enrollment number or password." });
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

// Student Registration with Master Roster Pre-Verification
router.post("/register", async (req, res) => {
  try {
    const rawFullName = (req.body.fullName || "").toString().trim();
    const email = (req.body.email || "").toString().toLowerCase().trim();
    const password = (req.body.password || "").toString().trim();
    const enrollmentNo = (req.body.enrollmentNo || "").toString().toUpperCase().trim();
    let department = (req.body.department || "").toString().trim();
    let semester = Number(req.body.semester);
    let division = (req.body.division || "").toString().toUpperCase().trim();
    const phone = req.body.phone ? req.body.phone.toString().trim() : null;

    if (!email || !password || !enrollmentNo) {
      return res.status(400).json({ message: "Enrollment number, email, and password are required." });
    }

    // 1. Check Master Roster (if records exist in master roster)
    const rosterCount = await prisma.masterStudentRoster.count();
    let finalFullName = rawFullName;

    if (rosterCount > 0) {
      const rosterEntry = await prisma.masterStudentRoster.findUnique({
        where: { enrollmentNo }
      });

      if (!rosterEntry) {
        return res.status(403).json({
          message: `Unauthorized registration: Enrollment number "${enrollmentNo}" is not in the University Master Roster. Please contact your Department Admin.`
        });
      }

      if (rosterEntry.isClaimed) {
        return res.status(409).json({
          message: `Enrollment number "${enrollmentNo}" is already registered. Please log in to your account.`
        });
      }

      // Enforce university verified details
      finalFullName = rosterEntry.fullName || rawFullName;
      department = rosterEntry.department;
      semester = rosterEntry.semester;
      division = rosterEntry.division;
    }

    if (!finalFullName || !department || !semester || !division) {
      return res.status(400).json({ message: "Student academic details (Department, Semester, Division) are required." });
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
        fullName: finalFullName,
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

    // Mark master roster entry as claimed if it exists
    await prisma.masterStudentRoster.updateMany({
      where: { enrollmentNo },
      data: { isClaimed: true }
    });

    const jwtSecret = process.env.JWT_SECRET || "visionattend_secret_key_123!";
    const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: "1d" });

    return res.status(201).json({
      message: "Registration successful! Welcome to FacultyEase Ai.",
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