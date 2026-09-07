import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SubjectService } from '../../../services/subject';
import { Attendance } from '../../../core/services/attendance';
import { Faculty } from '../../../core/services/faculty';
import { AttendanceCameraComponent } from '../attendance-camera/attendance-camera';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-faculty-dashboard', standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatSnackBarModule,
    AttendanceCameraComponent,
    MatCheckboxModule,
    MatSlideToggleModule
  ],
  templateUrl: './faculty-dashboard.html', styleUrl: './faculty-dashboard.scss'
})
export class FacultyDashboard implements OnInit {
  private subjectService = inject(SubjectService);
  private attendanceService = inject(Attendance);
  private facultyService = inject(Faculty);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  subjects: any[] = [];
  selectedSubjectId: number | null = null;
  attendanceActive = false;
  attendanceRecords: any[] = [];
  enrolledStudents: any[] = [];
  filterByDay = false;

  // Proxy Attendance Mode
  isProxyMode = false;
  faculties: any[] = [];
  selectedAbsentFacultyId: number | null = null;
  proxyNotes = '';
  currentUserId: number | null = null;

  // Custom Date selection
  selectedDate: string = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  getDayName(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  getFilteredSubjects(): any[] {
    if (!this.filterByDay || !this.selectedDate) {
      return this.subjects;
    }
    const dayName = this.getDayName(this.selectedDate);
    if (!dayName) return this.subjects;
    
    return this.subjects.filter(subj => 
      subj.name.toLowerCase().includes(dayName.toLowerCase())
    );
  }

  ngOnInit() {
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.currentUserId = user.id ?? null;
    } catch { /* ignore */ }

    this.loadOwnSubjects();
    this.loadFaculties();
  }

  loadOwnSubjects() {
    this.subjectService.getSubjects().subscribe({
      next: (subjects) => {
        this.subjects = subjects || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Could not load subjects', err)
    });
  }

  loadFaculties() {
    this.facultyService.getFaculty().subscribe({
      next: (data) => {
        this.faculties = (data || []).filter(f => f.userId !== this.currentUserId);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Could not load faculties', err)
    });
  }

  toggleProxyMode() {
    this.selectedSubjectId = null;
    this.attendanceRecords = [];
    this.enrolledStudents = [];
    this.attendanceActive = false;

    if (this.isProxyMode) {
      if (this.selectedAbsentFacultyId) {
        this.loadAbsentFacultySubjects(this.selectedAbsentFacultyId);
      } else {
        this.subjects = [];
      }
      this.snackBar.open("⚡ Proxy Mode Activated — Select the absent faculty & their subject", "Close", { duration: 3500 });
    } else {
      this.selectedAbsentFacultyId = null;
      this.proxyNotes = '';
      this.loadOwnSubjects();
      this.snackBar.open("Switched back to Regular Lecture Mode", "Close", { duration: 2500 });
    }
    this.cdr.detectChanges();
  }

  onAbsentFacultyChange() {
    this.selectedSubjectId = null;
    this.attendanceRecords = [];
    this.enrolledStudents = [];
    if (this.selectedAbsentFacultyId) {
      this.loadAbsentFacultySubjects(this.selectedAbsentFacultyId);
    } else {
      this.subjects = [];
    }
  }

  loadAbsentFacultySubjects(facultyId: number) {
    this.subjectService.getSubjects(facultyId).subscribe({
      next: (subjects) => {
        this.subjects = subjects || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Could not load absent faculty subjects', err)
    });
  }

  getSelectedAbsentFacultyName(): string {
    const f = this.faculties.find(fac => fac.id === this.selectedAbsentFacultyId);
    return f ? f.user?.fullName : 'Absent Faculty';
  }

  onSubjectChange() {
    this.loadAttendance();
    this.loadEnrolledStudents();
  }

  onDateChange() {
    this.loadAttendance();
  }

  loadEnrolledStudents() {
    if (this.selectedSubjectId) {
      this.subjectService.getEnrolledStudents(this.selectedSubjectId).subscribe({
        next: (students) => {
          this.enrolledStudents = students || [];
          this.cdr.detectChanges();
        },
        error: (err) => console.error(err)
      });
    }
  }

  loadAttendance() {
    if (this.selectedSubjectId) {
      this.attendanceService.getSubjectAttendance(this.selectedSubjectId, this.selectedDate).subscribe({
        next: (records: any[]) => {
          this.attendanceRecords = records || [];
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error(err)
      });
    }
  }

  isStudentPresent(enrollmentNo: string): boolean {
    const selectedDateObj = new Date(this.selectedDate);
    const targetStr = selectedDateObj.toDateString();
    return this.attendanceRecords.some(r => 
      r.enrollmentNo === enrollmentNo && 
      new Date(r.date).toDateString() === targetStr
    );
  }

  markPresentManually(studentId: number) {
    if (this.selectedSubjectId) {
      this.attendanceService.markPresent(
        studentId, 
        this.selectedSubjectId, 
        this.selectedDate,
        this.isProxyMode,
        this.proxyNotes
      ).subscribe({
        next: (result) => {
          if (result.success) {
            this.snackBar.open(
              this.isProxyMode ? "⚡ Proxy attendance marked manually" : "Attendance marked manually", 
              "Close", 
              { duration: 2500 }
            );
          }
          this.loadAttendance();
        },
        error: (err) => console.error(err)
      });
    }
  }

  resetTodaySession() {
    if (!this.selectedSubjectId) return;
    if (confirm("Are you sure you want to reset today's attendance logs for this subject? This will delete both live scan and manual records logged today.")) {
      this.attendanceService.clearTodaySubjectAttendance(this.selectedSubjectId).subscribe({
        next: (result) => {
          this.snackBar.open(result.message || "Attendance records successfully reset.", "Close", { duration: 3000 });
          this.loadAttendance();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || "Failed to reset attendance.", "Close", { duration: 3000 });
        }
      });
    }
  }

  startAttendance() { 
    if (this.selectedSubjectId) {
      this.attendanceActive = true;
      this.loadAttendance();
      this.loadEnrolledStudents();
    }
  }

  endLecture() {
    if (!this.attendanceActive && !this.selectedSubjectId) return;

    const presentCount = this.attendanceRecords.length;
    this.attendanceActive = false;
    this.loadAttendance();
    this.loadEnrolledStudents();

    const snackRef = this.snackBar.open(
      `🎓 Lecture Ended! ${presentCount} student(s) marked Present. Attendance records are saved & updated in reports.`,
      'View Reports',
      { duration: 6000 }
    );

    snackRef.onAction().subscribe(() => {
      this.router.navigate(['/dashboard/faculty/reports']);
    });
  }

  stopAttendance() { 
    this.endLecture();
  }

  onStudentMarked() {
    this.loadAttendance();
    this.loadEnrolledStudents();
  }
}
