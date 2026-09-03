import { Request, Response } from "express";
import bcrypt from "bcrypt";
import  prisma  from "../prisma";

export const createStudent = async (req: Request, res: Response) => {

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

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists"
      });
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
        semester,
        division,
        phone,
        userId: user.id
      }
    });

    res.status(201).json({
      message: "Student Created Successfully",
      student
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Internal Server Error"
    });

  }


};



export const getAllStudents = async (req: Request, res: Response) => {
  try {

    const students = await prisma.student.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isActive: true
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    res.status(200).json(students);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Internal Server Error"
    });
  }
};