import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { timeout } from 'rxjs';
import { Attendance, StudentAttendance } from '../../../core/services/attendance';

@Component({
  selector: 'app-student-attendance', standalone: true,
  imports: [CommonModule, DatePipe, MatTableModule, MatProgressSpinnerModule, MatCardModule],
  templateUrl: './student-attendance.html', styleUrl: './student-attendance.scss'
})
export class StudentAttendanceComponent implements OnInit {
  private attendanceService = inject(Attendance);
  private cdr = inject(ChangeDetectorRef);
  displayedColumns = ['subjectName', 'date', 'status', 'facultyName'];
  records: StudentAttendance[] = [];
  loading = true;
  error = '';

  ngOnInit() {
    this.attendanceService.getMyAttendance().pipe(
      timeout(10000)
    ).subscribe({
      next: records => {
        this.records = records || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.loading = false;
        this.cdr.detectChanges();
        if (error.name === 'TimeoutError') {
          this.error = 'Attendance request timed out. Please confirm that the backend and database are running.';
          return;
        }
        this.error = error.status === 401 || error.status === 403
          ? 'Your student session is not authorized. Please log out and sign in again.'
          : error.error?.message ?? 'Unable to load attendance.';
      },
      complete: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
