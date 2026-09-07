import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { CommonModule, DatePipe } from '@angular/common';
import { StudentService } from '../../../core/services/student';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatProgressSpinnerModule, MatTableModule, DatePipe],
  templateUrl: './student-dashboard.html',
  styleUrl: './student-dashboard.scss'
})
export class StudentDashboard implements OnInit {
  private studentService = inject(StudentService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  error = '';
  
  student: any = null;
  stats: any = {
    totalSubjects: 0,
    totalLectures: 0,
    attendedLectures: 0,
    absentLectures: 0,
    overallPercentage: 0,
    isEligible: true,
    statusText: 'Loading...'
  };
  subjects: any[] = [];
  recentActivity: any[] = [];

  userName = 'Student';
  userInitials = 'S';
  studentId: number | null = null;
  faceRegistered = false;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.error = '';

    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.userName = user.fullName ?? user.email ?? 'Student';
      this.userInitials = this.userName.split(' ').slice(0, 2).map((n: string) => n[0]).join('');
    } catch { /* ignore */ }

    this.studentService.getDashboardSummary().subscribe({
      next: (data) => {
        this.student = data.student;
        this.stats = data.stats;
        this.subjects = data.subjects || [];
        this.recentActivity = data.recentActivity || [];

        if (this.student) {
          this.studentId = this.student.id;
          this.faceRegistered = this.student.faceRegistered;
          this.userName = this.student.fullName || this.userName;
          this.userInitials = this.userName.split(' ').slice(0, 2).map((n: string) => n[0]).join('');
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Could not load student dashboard summary', err);
        // Fallback to getProfile if dashboard-summary has issue
        this.studentService.getProfile().subscribe({
          next: (profile) => {
            this.student = profile;
            this.studentId = profile.id;
            this.faceRegistered = profile.faceRegistered;
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading = false;
            this.error = 'Could not load student information. Please ensure backend is active.';
            this.cdr.detectChanges();
          }
        });
      }
    });
  }
}
