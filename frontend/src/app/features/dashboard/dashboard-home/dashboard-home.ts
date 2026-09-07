import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { DashboardService, DashboardStats } from '../../../services/dashboard';
import { Attendance } from '../../../core/services/attendance';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-dashboard-home',
  imports: [CommonModule, RouterLink, MatSnackBarModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
  standalone: true
})
export class DashboardHome implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private attendanceService = inject(Attendance);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  userRole = '';

  stats: DashboardStats = {
    totalStudents: 0,
    totalFaculty: 0,
    todaysAttendance: 0,
    attendanceRate: 0,
    recentLogs: [],
    classes: []
  };

  ngOnInit() {
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.userRole = user.role ?? '';
    } catch { /* ignore */ }

    this.authService.getProfile().subscribe({
      next: (res) => {
        console.log('Profile:', res);
      },
      error: (err) => {
        console.error(err);
      }
    });

    this.loadStats();
  }

  loadStats() {
    this.dashboardService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Could not load stats:', err);
      }
    });
  }

  clearAllRecords() {
    if (confirm('Are you absolutely sure you want to delete ALL attendance records from the database? This action is destructive and cannot be undone.')) {
      this.attendanceService.clearAllAttendance().subscribe({
        next: (res) => {
          this.snackBar.open(res.message || 'All attendance records successfully cleared.', 'Close', { duration: 3000 });
          this.loadStats();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to clear attendance records.', 'Close', { duration: 3000 });
        }
      });
    }
  }

  clearStudents() {
    if (confirm('Are you absolutely sure you want to delete ALL student records and their user accounts? This will also clear all associated attendance logs.')) {
      this.dashboardService.clearStudents().subscribe({
        next: (res) => {
          this.snackBar.open(res.message || 'All student records deleted successfully.', 'Close', { duration: 3000 });
          this.loadStats();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to delete student records.', 'Close', { duration: 3000 });
        }
      });
    }
  }

  clearFaculty() {
    if (confirm('Are you absolutely sure you want to delete ALL faculty records, assigned subjects, and their user accounts? This will also clear all associated attendance logs.')) {
      this.dashboardService.clearFaculty().subscribe({
        next: (res) => {
          this.snackBar.open(res.message || 'All faculty records and subjects deleted.', 'Close', { duration: 3000 });
          this.loadStats();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to delete faculty records.', 'Close', { duration: 3000 });
        }
      });
    }
  }

  resetAllData() {
    if (confirm('CRITICAL WARNING: This will completely wipe ALL student, faculty, subject, and attendance records from the database. Only your administrator account will remain. Are you sure you want to proceed?')) {
      this.dashboardService.resetDatabase().subscribe({
        next: (res) => {
          this.snackBar.open(res.message || 'Entire database successfully reset.', 'Close', { duration: 3000 });
          this.loadStats();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to reset database.', 'Close', { duration: 3000 });
        }
      });
    }
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = [
      'linear-gradient(135deg, #4F46E5, #818CF8)', // Indigo
      'linear-gradient(135deg, #06B6D4, #22D3EE)', // Cyan
      'linear-gradient(135deg, #10B981, #34D399)', // Emerald
      'linear-gradient(135deg, #F59E0B, #FCD34D)', // Amber
      'linear-gradient(135deg, #EC4899, #F472B6)'  // Pink
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  }
}
