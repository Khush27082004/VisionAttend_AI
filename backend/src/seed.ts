import prisma from "./prisma";
import bcrypt from "bcrypt";

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const facultyPassword = await bcrypt.hash("faculty123", 10);
  const studentPassword = await bcrypt.hash("student123", 10);

  // Admin Account
  await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: { password: adminPassword, role: "ADMIN", fullName: "System Admin" },
    create: {
      fullName: "System Admin",
      email: "admin@gmail.com",
      password: adminPassword,
      role: "ADMIN"
    }
  });

  // Faculty Account
  const facultyUser = await prisma.user.upsert({
    where: { email: "faculty@gmail.com" },
    update: { password: facultyPassword, role: "FACULTY", fullName: "Dr. Sarah Jenkins" },
    create: {
      fullName: "Dr. Sarah Jenkins",
      email: "faculty@gmail.com",
      password: facultyPassword,
      role: "FACULTY"
    }
  });

  await prisma.faculty.upsert({
    where: { userId: facultyUser.id },
    update: { department: "Computer Engineering", employeeId: "EMP-001" },
    create: {
      userId: facultyUser.id,
      department: "Computer Engineering",
      employeeId: "EMP-001"
    }
  });

  // Student Account
  const studentUser = await prisma.user.upsert({
    where: { email: "student@gmail.com" },
    update: { password: studentPassword, role: "STUDENT", fullName: "Alex Rivera" },
    create: {
      fullName: "Alex Rivera",
      email: "student@gmail.com",
      password: studentPassword,
      role: "STUDENT"
    }
  });

  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: { enrollmentNo: "22CS001", department: "Computer Engineering", semester: 6, division: "CE-1" },
    create: {
      userId: studentUser.id,
      enrollmentNo: "22CS001",
      department: "Computer Engineering",
      semester: 6,
      division: "CE-1"
    }
  });

  console.log("Database seeded successfully with Admin, Faculty, and Student accounts!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
