import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../../core/services/student';

@Component({
  selector: 'app-student-dashboard', standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule],
  templateUrl: './student-dashboard.html', styleUrl: './student-dashboard.scss'
})
export class StudentDashboard implements OnInit {
  private studentService = inject(StudentService);
  private cdr = inject(ChangeDetectorRef);

  userName     = 'Student';
  userInitials = 'S';
  studentId: number | null = null;
  faceRegistered = false;

  ngOnInit() {
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.userName     = user.fullName ?? user.email ?? 'Student';
      this.userInitials = this.userName.split(' ').slice(0,2).map((n: string) => n[0]).join('');
    } catch { /* ignore */ }

    this.studentService.getProfile().subscribe({
      next: (profile) => {
        this.studentId = profile.id;
        this.faceRegistered = profile.faceRegistered;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Could not load student profile', err);
      }
    });
  }
}
