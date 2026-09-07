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
import { FacultyListComponent } from './features/admin/faculty/faculty-list/faculty-list';
import { AddFacultyComponent } from './features/admin/faculty/add-faculty/add-faculty';
import { SubjectListComponent } from './features/admin/subjects/subject-list/subject-list';
import { AddSubjectComponent } from './features/admin/subjects/add-subject/add-subject';
import { FacultySubjectsComponent } from './features/faculty/subjects/faculty-subjects';
import { MasterRosterComponent } from './features/admin/roster/master-roster/master-roster';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'dashboard', component: DashboardLayoutComponent, canActivate: [authGuard], children: [
      { path: '', component: DashboardHome },
      { path: 'students', component: StudentList },
      { path: 'students/add', component: AddStudent },
      { path: 'students/edit/:id', component: EditStudent },
      { path: 'students/:id/register-face', component: FaceRegistrationComponent },
      { path: 'student', component: StudentDashboard },
      { path: 'student/attendance', component: StudentAttendanceComponent },
      { path: 'faculty', component: FacultyDashboard },
      { path: 'faculty/records', component: AttendanceRecordsComponent },
      { path: 'faculty/subjects', component: FacultySubjectsComponent },
      { path: 'admin/faculty', component: FacultyListComponent },
      { path: 'admin/faculty/add', component: AddFacultyComponent },
      { path: 'admin/roster', component: MasterRosterComponent },
      { path: 'subjects', component: SubjectListComponent },
      { path: 'subjects/add', component: AddSubjectComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];