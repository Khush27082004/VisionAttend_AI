import { Router } from "express";
import prisma from "../prisma";
import { authenticate, AuthRequest } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

router.get("/my", authenticate, authorize("STUDENT"), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const attendance = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        status: true,
        isProxy: true,
        proxyNotes: true,
        subject: { select: { name: true } },
        faculty: { select: { user: { select: { fullName: true } } } },
        proxyFaculty: { select: { user: { select: { fullName: true } } } }
      }
    });

    return res.json(attendance.map(record => ({
      id: record.id,
      subjectName: record.subject.name,
      date: record.date,
      status: record.status,
      facultyName: record.faculty.user.fullName,
      isProxy: record.isProxy,
      proxyNotes: record.proxyNotes,
      proxyFacultyName: record.proxyFaculty?.user?.fullName || null
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load attendance" });
  }
});

router.post("/", authenticate, authorize("FACULTY"), async (req: AuthRequest, res) => {
  try {
    const studentId = Number(req.body.studentId);
    const subjectId = Number(req.body.subjectId);
    const customDateStr = req.body.date;
    const isProxy = Boolean(req.body.isProxy);
    const proxyNotes = req.body.proxyNotes ? String(req.body.proxyNotes).trim() : null;

    if (!Number.isInteger(studentId) || !Number.isInteger(subjectId)) {
      return res.status(400).json({ success: false, message: "studentId and subjectId are required" });
    }

    const currentFaculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!currentFaculty) {
      return res.status(403).json({ success: false, message: "Faculty profile not found" });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { faculty: { include: { user: true } } }
    });
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    // If not proxy mode, verify faculty owns the subject
    if (!isProxy && subject.facultyId !== currentFaculty.id) {
      return res.status(403).json({ success: false, message: "You cannot mark attendance for this subject without proxy mode enabled" });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ success: false, message: "Recognized student no longer exists" });
    }

    const now = new Date();
    let classDate = now;
    if (customDateStr) {
      const dateParts = customDateStr.split('-');
      if (dateParts.length === 3) {
        classDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
      } else {
        classDate = new Date(customDateStr);
      }
      classDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }

    const startOfDay = new Date(classDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(startOfDay.getDate() + 1);

    const exists = await prisma.attendance.findFirst({
      where: {
        studentId,
        subjectId,
        date: { gte: startOfDay, lt: endOfDay }
      }
    });
    if (exists) {
      return res.json({ success: false, message: "Attendance already marked for this date" });
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentId,
        subjectId,
        facultyId: subject.facultyId, // Assigned to the subject owner so it directly appears in absent faculty's records!
        proxyFacultyId: isProxy ? currentFaculty.id : null,
        isProxy: isProxy,
        proxyNotes: isProxy ? proxyNotes : null,
        status: "Present",
        date: classDate
      }
    });
    return res.status(201).json({ success: true, attendance });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not mark attendance" });
  }
});

router.get("/faculty/all", authenticate, authorize("FACULTY"), async (req: AuthRequest, res) => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { userId: req.user!.id } });
    if (!faculty) {
      return res.status(404).json({ message: "Faculty profile not found" });
    }

    const view = req.query.view as string; // 'all' | 'mine' | 'proxy_conducted' | 'proxy_received'
    let whereClause: any = {
      OR: [
        { facultyId: faculty.id },
        { proxyFacultyId: faculty.id }
      ]
    };

    if (view === "mine") {
      whereClause = { facultyId: faculty.id, isProxy: false };
    } else if (view === "proxy_conducted") {
      whereClause = { proxyFacultyId: faculty.id, isProxy: true };
    } else if (view === "proxy_received") {
      whereClause = { facultyId: faculty.id, isProxy: true };
    }

    const attendance = await prisma.attendance.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      include: {
        student: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true
              }
            }
          }
        },
        subject: {
          select: {
            name: true
          }
        },
        faculty: {
          select: {
            user: {
              select: {
                fullName: true
              }
            }
          }
        },
        proxyFaculty: {
          select: {
            user: {
              select: {
                fullName: true
              }
            }
          }
        }
      }
    });

    return res.json(attendance.map(a => ({
      id: a.id,
      date: a.date,
      status: a.status,
      subjectName: a.subject.name,
      studentName: a.student.user.fullName,
      enrollmentNo: a.student.enrollmentNo,
      department: a.student.department,
      semester: a.student.semester,
      division: a.student.division,
      isProxy: a.isProxy,
      proxyNotes: a.proxyNotes,
      primaryFacultyName: a.faculty?.user?.fullName,
      proxyFacultyName: a.proxyFaculty?.user?.fullName,
      isProxyConductedByMe: a.proxyFacultyId === faculty.id,
      isProxyReceivedForMe: a.facultyId === faculty.id && a.isProxy
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load all attendance records" });
  }
});

router.get("/subject/:subjectId", authenticate, authorize("FACULTY", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const subjectId = Number(req.params.subjectId);
    if (!Number.isInteger(subjectId)) {
      return res.status(400).json({ message: "Invalid subject ID" });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { faculty: { include: { user: true } } }
    });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const queryDateStr = req.query.date as string;
    const whereClause: any = { subjectId };

    if (queryDateStr) {
      let classDate: Date;
      const dateParts = queryDateStr.split('-');
      if (dateParts.length === 3) {
        classDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
      } else {
        classDate = new Date(queryDateStr);
      }
      const startOfDay = new Date(classDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(startOfDay.getDate() + 1);
      whereClause.date = { gte: startOfDay, lt: endOfDay };
    }

    const attendance = await prisma.attendance.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      include: {
        student: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true
              }
            }
          }
        },
        faculty: {
          select: {
            user: { select: { fullName: true } }
          }
        },
        proxyFaculty: {
          select: {
            user: { select: { fullName: true } }
          }
        }
      }
    });

    return res.json(attendance.map(a => ({
      id: a.id,
      date: a.date,
      status: a.status,
      studentName: a.student.user.fullName,
      enrollmentNo: a.student.enrollmentNo,
      department: a.student.department,
      semester: a.student.semester,
      division: a.student.division,
      isProxy: a.isProxy,
      proxyNotes: a.proxyNotes,
      primaryFacultyName: a.faculty?.user?.fullName,
      proxyFacultyName: a.proxyFaculty?.user?.fullName
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load attendance" });
  }
});

router.get("/report/classwise", authenticate, authorize("FACULTY", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const subjectId = req.query.subjectId ? Number(req.query.subjectId) : null;
    const department = req.query.department ? String(req.query.department).trim() : null;
    const semester = req.query.semester ? Number(req.query.semester) : null;
    const division = req.query.division ? String(req.query.division).trim() : null;
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;

    let targetSubject: any = null;
    if (subjectId) {
      targetSubject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: { faculty: { include: { user: true } } }
      });
    }

    const effDept = targetSubject ? targetSubject.department : department;
    const effSem = targetSubject ? targetSubject.semester : semester;

    // 1. Build date range filter
    let dateFilter: any = {};
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      dateFilter = { gte: start, lte: end };
    } else if (startDateStr) {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      dateFilter = { gte: start };
    } else if (endDateStr) {
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      dateFilter = { lte: end };
    }

    // 2. Fetch enrolled students matching department, semester, and division
    let studentWhere: any = {};
    if (effDept) studentWhere.department = effDept;
    if (effSem) studentWhere.semester = effSem;
    if (division && division !== "ALL" && division !== "") studentWhere.division = division;

    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      },
      orderBy: { enrollmentNo: "asc" }
    });

    // 3. Find all attendance logs matching subjectId/dept/sem and date range
    let attendanceWhere: any = {};
    if (subjectId) {
      attendanceWhere.subjectId = subjectId;
    } else {
      if (effDept || effSem || (division && division !== "ALL" && division !== "")) {
        attendanceWhere.student = {};
        if (effDept) attendanceWhere.student.department = effDept;
        if (effSem) attendanceWhere.student.semester = effSem;
        if (division && division !== "ALL" && division !== "") attendanceWhere.student.division = division;
      }
    }
    if (Object.keys(dateFilter).length > 0) {
      attendanceWhere.date = dateFilter;
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: attendanceWhere,
      select: {
        id: true,
        date: true,
        studentId: true,
        subjectId: true,
        status: true,
        isProxy: true
      }
    });

    // 4. Calculate distinct lecture sessions/dates conducted
    const lectureSessions = new Set<string>();
    attendanceRecords.forEach(a => {
      const dStr = new Date(a.date).toISOString().split('T')[0];
      lectureSessions.add(`${a.subjectId}_${dStr}`);
    });
    const totalLecturesConducted = lectureSessions.size;

    // 5. Count records per student
    const studentAttendanceMap = new Map<number, number>();
    attendanceRecords.forEach(a => {
      studentAttendanceMap.set(a.studentId, (studentAttendanceMap.get(a.studentId) || 0) + 1);
    });

    let defaulterCount = 0;
    let eligibleCount = 0;
    let totalPercentageSum = 0;

    const studentReports = students.map(s => {
      const attended = studentAttendanceMap.get(s.id) || 0;
      const total = totalLecturesConducted;
      const absent = Math.max(0, total - attended);
      const percentage = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : 0;
      const isDefaulter = percentage < 75.0 && total > 0;
      
      if (isDefaulter) {
        defaulterCount++;
      } else {
        eligibleCount++;
      }
      totalPercentageSum += percentage;

      let div = (s.division || "").trim();
      if (!div || div === "A" || div === "B" || div === "C" || div === "D") {
        const deptStr = (s.department || effDept || "").toLowerCase();
        if (deptStr.includes("design") || deptStr.includes("csd")) {
          div = div === "B" ? "CSD-2" : div === "C" ? "CSD-3" : "CSD-1";
        } else if (deptStr.includes("information") || deptStr.includes("it")) {
          div = div === "B" ? "IT-2" : div === "C" ? "IT-3" : "IT-1";
        } else {
          div = div === "B" ? "CE-2" : div === "C" ? "CE-3" : "CE-1";
        }
      }

      return {
        studentId: s.id,
        fullName: s.user.fullName,
        email: s.user.email,
        enrollmentNo: s.enrollmentNo,
        department: s.department,
        semester: s.semester,
        division: div,
        attendedLectures: attended,
        absentLectures: absent,
        totalLectures: total,
        percentage,
        isDefaulter,
        status: isDefaulter ? "DEFICIENT (< 75%)" : "ELIGIBLE (>= 75%)"
      };
    });

    const avgPercentage = students.length > 0 ? Number((totalPercentageSum / students.length).toFixed(1)) : 0;

    return res.json({
      summary: {
        subjectName: targetSubject ? targetSubject.name : "All Classes",
        facultyName: targetSubject?.faculty?.user?.fullName || null,
        department: effDept || "All Departments",
        semester: effSem || "All Semesters",
        division: division || "All Divisions",
        startDate: startDateStr || null,
        endDate: endDateStr || null,
        totalStudents: students.length,
        totalLecturesConducted,
        defaulterCount,
        eligibleCount,
        averagePercentage: avgPercentage
      },
      students: studentReports
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return res.status(500).json({ message: "Internal server error while generating attendance report" });
  }
});

router.get("/report/faculty-workload", authenticate, authorize("ADMIN", "FACULTY"), async (req: AuthRequest, res) => {
  try {
    const department = req.query.department ? String(req.query.department).trim() : null;
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;

    // 1. Build date range filter
    let dateFilter: any = {};
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      dateFilter = { gte: start, lte: end };
    } else if (startDateStr) {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      dateFilter = { gte: start };
    } else if (endDateStr) {
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      dateFilter = { lte: end };
    }

    // 2. Fetch all faculties
    let facultyWhere: any = {};
    if (department && department !== "ALL" && department !== "") {
      facultyWhere.department = department;
    }

    const faculties = await prisma.faculty.findMany({
      where: facultyWhere,
      include: {
        user: { select: { fullName: true, email: true, isActive: true } },
        subjects: { select: { id: true, name: true, semester: true, department: true } }
      },
      orderBy: { employeeId: "asc" }
    });

    // 3. Fetch attendance records in timeframe
    let attendanceWhere: any = {};
    if (Object.keys(dateFilter).length > 0) {
      attendanceWhere.date = dateFilter;
    }

    const allAttendance = await prisma.attendance.findMany({
      where: attendanceWhere,
      include: {
        subject: { select: { id: true, name: true } },
        student: {
          include: {
            user: { select: { fullName: true } }
          }
        },
        faculty: { include: { user: { select: { fullName: true } } } },
        proxyFaculty: { include: { user: { select: { fullName: true } } } }
      },
      orderBy: { date: "desc" }
    });

    // 4. Calculate metrics for each faculty
    let overallRegularLectures = 0;
    let overallProxyConducted = 0;
    let overallLeaveInstances = 0;

    const facultyReports = faculties.map(fac => {
      const regularSessions = new Map<string, any>();
      const proxyConductedSessions = new Map<string, any>();
      const proxyReceivedSessions = new Map<string, any>();

      allAttendance.forEach(a => {
        const dStr = new Date(a.date).toISOString().split('T')[0];
        const key = `${a.subjectId}_${dStr}`;

        if (a.facultyId === fac.id && !a.isProxy) {
          if (!regularSessions.has(key)) {
            regularSessions.set(key, {
              date: a.date,
              subjectName: a.subject.name,
              type: "REGULAR",
              studentCount: 1,
              notes: null
            });
          } else {
            regularSessions.get(key).studentCount++;
          }
        }

        if (a.proxyFacultyId === fac.id && a.isProxy) {
          if (!proxyConductedSessions.has(key)) {
            proxyConductedSessions.set(key, {
              date: a.date,
              subjectName: a.subject.name,
              type: "PROXY_CONDUCTED",
              coveredFor: a.faculty?.user?.fullName || "Colleague",
              studentCount: 1,
              notes: a.proxyNotes
            });
          } else {
            proxyConductedSessions.get(key).studentCount++;
          }
        }

        if (a.facultyId === fac.id && a.isProxy && a.proxyFacultyId !== fac.id) {
          if (!proxyReceivedSessions.has(key)) {
            proxyReceivedSessions.set(key, {
              date: a.date,
              subjectName: a.subject.name,
              type: "LEAVE_COVERED_BY_PROXY",
              coveredBy: a.proxyFaculty?.user?.fullName || "Proxy Colleague",
              studentCount: 1,
              notes: a.proxyNotes
            });
          } else {
            proxyReceivedSessions.get(key).studentCount++;
          }
        }
      });

      const regularCount = regularSessions.size;
      const proxyConductedCount = proxyConductedSessions.size;
      const proxyReceivedCount = proxyReceivedSessions.size;
      const totalLecturesTaught = regularCount + proxyConductedCount;

      overallRegularLectures += regularCount;
      overallProxyConducted += proxyConductedCount;
      overallLeaveInstances += proxyReceivedCount;

      let workloadStatus = "ACTIVE";
      if (proxyReceivedCount >= 2) {
        workloadStatus = "ON_LEAVE";
      } else if (proxyConductedCount >= 2) {
        workloadStatus = "HIGH_PROXY";
      }

      const detailedLogs = [
        ...Array.from(regularSessions.values()),
        ...Array.from(proxyConductedSessions.values()),
        ...Array.from(proxyReceivedSessions.values())
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        facultyId: fac.id,
        fullName: fac.user.fullName,
        email: fac.user.email,
        employeeId: fac.employeeId,
        department: fac.department,
        designation: fac.designation || "Assistant Professor",
        subjects: fac.subjects.map(s => s.name),
        regularLecturesCount: regularCount,
        proxyConductedCount,
        proxyReceivedCount,
        totalLecturesTaught,
        workloadStatus,
        detailedLogs
      };
    });

    return res.json({
      summary: {
        department: department || "All Departments",
        startDate: startDateStr || null,
        endDate: endDateStr || null,
        totalFaculty: faculties.length,
        totalRegularLectures: overallRegularLectures,
        totalProxyLectures: overallProxyConducted,
        totalLeaveInstances: overallLeaveInstances
      },
      faculties: facultyReports
    });
  } catch (error) {
    console.error("Error generating faculty workload report:", error);
    return res.status(500).json({ message: "Internal server error generating faculty report" });
  }
});

router.post("/seed-demo", authenticate, authorize("FACULTY", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    let faculty = await prisma.faculty.findFirst({
      include: { user: true }
    });
    if (!faculty) {
      const u = await prisma.user.create({
        data: {
          fullName: "Prof. Rajesh Sharma",
          email: "rajesh.sharma@univ.edu",
          password: "$2b$10$DEMO_HASHED_PASSWORD_SAMPLE",
          role: "FACULTY"
        }
      });
      faculty = await prisma.faculty.create({
        data: {
          userId: u.id,
          employeeId: "EMP-CE-101",
          department: "Computer Engineering",
          designation: "Associate Professor"
        },
        include: { user: true }
      });
    }

    // Ensure a second faculty for proxy demonstration
    let secondFaculty = await prisma.faculty.findFirst({
      where: { id: { not: faculty.id } },
      include: { user: true }
    });
    if (!secondFaculty) {
      const u2 = await prisma.user.create({
        data: {
          fullName: "Prof. Priya Verma",
          email: "priya.verma@univ.edu",
          password: "$2b$10$DEMO_HASHED_PASSWORD_SAMPLE",
          role: "FACULTY"
        }
      });
      secondFaculty = await prisma.faculty.create({
        data: {
          userId: u2.id,
          employeeId: "EMP-CE-102",
          department: "Computer Engineering",
          designation: "Assistant Professor"
        },
        include: { user: true }
      });
    }

    // 1. Ensure subjects exist
    let subject = await prisma.subject.findFirst({
      where: { facultyId: faculty.id }
    });
    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          name: "Machine Learning (CE-1)",
          department: faculty.department || "Computer Engineering",
          semester: 6,
          facultyId: faculty.id
        }
      });
    }

    let secondSubject = await prisma.subject.findFirst({
      where: { facultyId: secondFaculty.id }
    });
    if (!secondSubject) {
      secondSubject = await prisma.subject.create({
        data: {
          name: "Operating Systems (CE-2)",
          department: "Computer Engineering",
          semester: 4,
          facultyId: secondFaculty.id
        }
      });
    }

    // 2. Demo student definitions with varying attendance rates
    const demoStudentsData = [
      { name: "Aarav Patel", enrollment: "230410116001", email: "aarav.patel@univ.edu", rate: 0.9 },
      { name: "Diya Sharma", enrollment: "230410116002", email: "diya.sharma@univ.edu", rate: 1.0 },
      { name: "Rohan Mehta", enrollment: "230410116003", email: "rohan.mehta@univ.edu", rate: 0.8 },
      { name: "Ananya Joshi", enrollment: "230410116004", email: "ananya.joshi@univ.edu", rate: 0.85 },
      { name: "Kabir Verma", enrollment: "230410116005", email: "kabir.verma@univ.edu", rate: 0.5 },
      { name: "Sneha Nair", enrollment: "230410116006", email: "sneha.nair@univ.edu", rate: 0.6 },
      { name: "Vikas Shah", enrollment: "230410116007", email: "vikas.shah@univ.edu", rate: 0.4 },
      { name: "Pooja Desai", enrollment: "230410116008", email: "pooja.desai@univ.edu", rate: 0.95 }
    ];

    const studentEntities: any[] = [];
    for (const d of demoStudentsData) {
      let stu = await prisma.student.findUnique({
        where: { enrollmentNo: d.enrollment }
      });
      if (!stu) {
        let u = await prisma.user.findUnique({ where: { email: d.email } });
        if (!u) {
          u = await prisma.user.create({
            data: {
              fullName: d.name,
              email: d.email,
              password: "$2b$10$DEMO_HASHED_PASSWORD_SAMPLE",
              role: "STUDENT"
            }
          });
        }
        stu = await prisma.student.create({
          data: {
            userId: u.id,
            enrollmentNo: d.enrollment,
            department: subject.department,
            semester: subject.semester,
            division: "CE-1"
          }
        });
      }
      studentEntities.push({ student: stu, rate: d.rate });
    }

    // 3. Generate 10 lecture dates over the past 3 weeks
    const today = new Date();
    const lectureDates: Date[] = [];
    for (let i = 1; i <= 10; i++) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - (11 - i) * 2);
      dt.setHours(10, 30, 0, 0);
      lectureDates.push(dt);
    }

    // 4. Create attendance records for each date (including proxy lectures!)
    let createdCount = 0;
    for (let idx = 0; idx < lectureDates.length; idx++) {
      const lDate = lectureDates[idx];
      // 2 sessions as proxy lectures
      const isProxySession = (idx === 3 || idx === 7);

      for (const item of studentEntities) {
        const shouldBePresent = (idx / lectureDates.length) < item.rate;

        if (shouldBePresent) {
          const start = new Date(lDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 1);

          const exists = await prisma.attendance.findFirst({
            where: {
              studentId: item.student.id,
              subjectId: subject.id,
              date: { gte: start, lt: end }
            }
          });

          if (!exists) {
            await prisma.attendance.create({
              data: {
                studentId: item.student.id,
                subjectId: subject.id,
                facultyId: faculty.id,
                proxyFacultyId: isProxySession ? secondFaculty.id : null,
                isProxy: isProxySession,
                proxyNotes: isProxySession ? "Covered Lecture 4 & Lab assignment on Decision Trees" : null,
                status: "Present",
                date: lDate
              }
            });
            createdCount++;
          }
        }
      }
    }

    return res.json({
      success: true,
      message: `Demo dataset seeded with faculty workload logs, regular lectures, and proxy records!`,
      subjectId: subject.id,
      subjectName: subject.name
    });
  } catch (error) {
    console.error("Error seeding demo report data:", error);
    return res.status(500).json({ success: false, message: "Could not seed demo report data" });
  }
});

router.delete("/all", authenticate, authorize("ADMIN"), async (req: AuthRequest, res) => {
  try {
    await prisma.attendance.deleteMany();
    return res.json({ success: true, message: "All attendance records have been cleared successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not clear attendance records." });
  }
});

router.delete("/subject/:subjectId/today", authenticate, authorize("FACULTY", "ADMIN"), async (req: AuthRequest, res) => {
  try {
    const subjectId = Number(req.params.subjectId);
    if (!Number.isInteger(subjectId)) {
      return res.status(400).json({ success: false, message: "Invalid subject ID" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const deleteResult = await prisma.attendance.deleteMany({
      where: {
        subjectId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    return res.json({ success: true, count: deleteResult.count, message: `Successfully cleared ${deleteResult.count} record(s) for today's session.` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not reset today's attendance logs" });
  }
});

export default router;
