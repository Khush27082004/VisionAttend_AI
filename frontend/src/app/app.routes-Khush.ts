import { Routes } from '@angular/router';
import { LoginComponent } from './authentication/pages/login/login';
import { RegisterComponent } from './authentication/pages/register/register';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout';
import { DashboardHome } from './features/dashboard/dashboard-home/dashboard-home';
import { authGuard } from './core/guards/auth-guard';
import { StudentList } from './features/students/student-list/student-list';
import { AddStudent } from './features/students/add-student/add-student';
import { EditStudent } from './features/students/edit-student/edit-student';
import { FaceRegistrationComponent } from './features/students/face-registration/face-registration';
import { StudentDashboard } from './features/student/student-dashboard/student-dashboard';
import { StudentAttendanceComponent } from './features/student/student-attendance/student-attendance';
import { FacultyDashboard } from './features/faculty/faculty-dashboard/faculty-dashboard';
import { AttendanceRecordsComponent } from './features/faculty/attendance-records/attendance-records';
import { FacultySubjectsComponent } from './features/faculty/subjects/faculty-subjects';
import { FacultyListComponent } from './features/admin/faculty/faculty-list/faculty-list';
import { AddFacultyComponent } from './features/admin/faculty/add-faculty/add-faculty';
import { SubjectListComponent } from './features/admin/subjects/subject-list/subject-list';
import { AddSubjectComponent } from './features/admin/subjects/add-subject/add-subject';

import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'dashboard', component: DashboardLayoutComponent, canActivate: [authGuard], children: [
      { path: '', component: DashboardHome },
      { path: 'students', component: StudentList, canActivate: [roleGuard(['ADMIN', 'FACULTY'])] },
      { path: 'students/add', component: AddStudent, canActivate: [roleGuard(['ADMIN', 'FACULTY'])] },
      { path: 'students/edit/:id', component: EditStudent, canActivate: [roleGuard(['ADMIN', 'FACULTY'])] },
      { path: 'students/:id/register-face', component: FaceRegistrationComponent, canActivate: [roleGuard(['ADMIN', 'FACULTY', 'STUDENT'])] },
      { path: 'student', component: StudentDashboard, canActivate: [roleGuard(['STUDENT'])] },
      { path: 'student/attendance', component: StudentAttendanceComponent, canActivate: [roleGuard(['STUDENT'])] },
      { path: 'faculty', component: FacultyDashboard, canActivate: [roleGuard(['FACULTY'])] },
      { path: 'faculty/records', component: AttendanceRecordsComponent, canActivate: [roleGuard(['FACULTY'])] },
      { path: 'faculty/subjects', component: FacultySubjectsComponent, canActivate: [roleGuard(['FACULTY'])] },
      { path: 'admin/faculty', component: FacultyListComponent, canActivate: [roleGuard(['ADMIN'])] },
      { path: 'admin/faculty/add', component: AddFacultyComponent, canActivate: [roleGuard(['ADMIN'])] },
      { path: 'subjects', component: SubjectListComponent, canActivate: [roleGuard(['ADMIN'])] },
      { path: 'subjects/add', component: AddSubjectComponent, canActivate: [roleGuard(['ADMIN'])] }
    ]
  },
  { path: '**', redirectTo: '' }
];
