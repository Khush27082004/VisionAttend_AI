import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import studentRoutes from "./routes/student.routes";
import facultyRoutes from "./routes/faculty.routes";
import subjectRoutes from "./routes/subject.routes";
import attendanceRoutes from "./routes/attendance.routes";
import dashboardRoutes from "./routes/dashboard.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads
app.use("/uploads", express.static("uploads"));

// Mount routes
app.use("/auth", authRoutes);
app.use("/students", studentRoutes);
app.use("/faculty", facultyRoutes);
app.use("/subjects", subjectRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.json({ message: "FacultyEase Ai API is running" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Server updated and verified

