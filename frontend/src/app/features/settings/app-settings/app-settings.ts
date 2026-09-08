import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ThemeService } from '../../../core/services/theme.service';
import { DashboardService } from '../../../services/dashboard';
import { Attendance } from '../../../core/services/attendance';
import { AuthService } from '../../../core/services/auth';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  templateUrl: './app-settings.html',
  styleUrl: './app-settings.scss'
})
export class AppSettingsComponent implements OnInit {
  private themeService = inject(ThemeService);
  private dashboardService = inject(DashboardService);
  private attendanceService = inject(Attendance);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  isDarkMode = false;
  userRole = '';
  userName = '';
  userEmail = '';

  aiServiceOnline = false;
  aiStatusChecking = true;

  ngOnInit() {
    this.isDarkMode = this.themeService.isDarkMode();

    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.userRole = user.role ?? '';
      this.userName = user.fullName ?? user.email ?? 'User';
      this.userEmail = user.email ?? '';
    } catch { /* ignore */ }

    this.checkAiService();
  }

  toggleTheme() {
    this.isDarkMode = this.themeService.toggleTheme();
    const modeName = this.isDarkMode ? 'Dark Mode' : 'Light Mode';
    this.snackBar.open(`🌗 Switched to ${modeName}`, 'Close', { duration: 2500 });
  }

  setTheme(dark: boolean) {
    if (this.isDarkMode !== dark) {
      this.isDarkMode = dark;
      this.themeService.setDark(dark);
      const modeName = dark ? 'Dark Mode' : 'Light Mode';
      this.snackBar.open(`🌗 Switched to ${modeName}`, 'Close', { duration: 2500 });
    }
  }

  checkAiService() {
    this.aiStatusChecking = true;
    this.http.get('http://127.0.0.1:8000/').subscribe({
      next: () => {
        this.aiServiceOnline = true;
        this.aiStatusChecking = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.aiServiceOnline = false;
        this.aiStatusChecking = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Admin Control Methods
  clearAllRecords() {
    if (confirm('Are you absolutely sure you want to delete ALL attendance records from the database? This action is destructive and cannot be undone.')) {
      this.attendanceService.clearAllAttendance().subscribe({
        next: (res) => {
          this.snackBar.open(res.message || 'All attendance records successfully cleared.', 'Close', { duration: 3000 });
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
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to reset database.', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
