# 🎯 VisionAttend AI

> AI-Powered Face Recognition Attendance System built with Angular, Express, Prisma & InsightFace

![Angular](https://img.shields.io/badge/Angular-19-DD0031?logo=angular)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)
![Python](https://img.shields.io/badge/Python-FastAPI-3776AB?logo=python)

## 📌 Overview

VisionAttend AI is a full-stack attendance management system that uses **face recognition** to automatically mark student attendance. Faculty members can start a live camera session, and the AI identifies enrolled students in real-time using InsightFace's 512-dimension face embeddings.

## 🏗️ Architecture

```
VisionAttend-AI/
├── frontend/         # Angular 19 (Material UI)
├── backend/          # Express.js + Prisma ORM (SQLite)
├── ai-service/       # FastAPI + InsightFace (Python)
└── .gitignore
```

## ✨ Features

- **🔐 Role-Based Access** — Admin, Faculty, and Student dashboards
- **📸 AI Face Recognition** — Real-time webcam attendance using InsightFace
- **📊 Attendance Tracking** — Subject-wise records with date filtering
- **👨‍🏫 Faculty Management** — Add faculty, assign subjects
- **🎓 Student Management** — Enroll students, register faces
- **📚 Subject Management** — Create courses, link to faculty
- **📱 Responsive Design** — Works on desktop and mobile

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- npm

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npx ts-node src/seed.ts    # Seeds demo accounts
npm run dev                 # Starts on port 5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
ng serve                    # Starts on port 4200
```

### 3. AI Service (Optional)
```bash
cd ai-service
pip install -r requirements.txt
uvicorn app:app --reload    # Starts on port 8000
```

## 🔑 Demo Accounts

| Role     | Email               | Password     |
|----------|---------------------|-------------|
| Admin    | admin@gmail.com     | admin123    |
| Faculty  | faculty@gmail.com   | faculty123  |
| Student  | student@gmail.com   | student123  |

## 🛠️ Tech Stack

| Layer      | Technology                      |
|------------|--------------------------------|
| Frontend   | Angular 19, Angular Material   |
| Backend    | Express.js, TypeScript         |
| Database   | SQLite via Prisma ORM          |
| AI Engine  | FastAPI, InsightFace, ONNX     |
| Auth       | JWT (JSON Web Tokens), bcrypt  |

## 📄 License

This project is for educational purposes.

---

Built with ❤️ by [Khush Ranpura](https://github.com/Khush27082004)
