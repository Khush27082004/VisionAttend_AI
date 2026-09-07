import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth';
import { RosterService, VerifyRosterResult } from '../../../services/roster';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private rosterService = inject(RosterService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  registerData = {
    fullName: '',
    email: '',
    password: '',
    enrollmentNo: '',
    department: '',
    semester: '',
    division: '',
    phone: ''
  };

  loading = false;
  verifyingEnrollment = false;
  isVerifiedInRoster = false;
  verificationMessage = '';
  verificationError = '';
  isClaimed = false;

  showPassword = false;
  errorMessage = '';
  currentYear = new Date().getFullYear();

  onEnrollmentChange() {
    this.isVerifiedInRoster = false;
    this.verificationMessage = '';
    this.verificationError = '';
    this.isClaimed = false;

    const enNo = this.registerData.enrollmentNo.trim();
    if (enNo.length >= 3) {
      this.verifyEnrollmentNumber();
    }
  }

  verifyEnrollmentNumber() {
    const enNo = this.registerData.enrollmentNo.trim();
    if (!enNo) return;

    this.verifyingEnrollment = true;
    this.verificationError = '';
    this.verificationMessage = '';

    this.rosterService.verifyEnrollment(enNo).subscribe({
      next: (res: VerifyRosterResult) => {
        this.verifyingEnrollment = false;
        if (res.valid) {
          if (res.data) {
            this.isVerifiedInRoster = true;
            this.registerData.fullName = res.data.fullName || this.registerData.fullName;
            this.registerData.department = res.data.department;
            this.registerData.semester = String(res.data.semester);
            this.registerData.division = res.data.division;
            if (res.data.email && !this.registerData.email) {
              this.registerData.email = res.data.email;
            }
            this.verificationMessage = `Verified by Master Roster: ${res.data.fullName} — ${res.data.department} (Sem ${res.data.semester})`;
          } else {
            // Open registration if roster is not configured
            this.isVerifiedInRoster = true;
            this.verificationMessage = 'Enrollment accepted.';
          }
        }
      },
      error: (err: any) => {
        this.verifyingEnrollment = false;
        this.isVerifiedInRoster = false;
        if (err.status === 409) {
          this.isClaimed = true;
          this.verificationError = 'This enrollment number is already registered with an active student account.';
        } else if (err.status === 404) {
          this.verificationError = `Enrollment number "${enNo}" was not found in the University Master Roster. Only authorized students can register.`;
        } else {
          this.verificationError = err.error?.message || 'Could not verify enrollment number.';
        }
      }
    });
  }

  register() {
    this.errorMessage = '';

    const { fullName, email, password, enrollmentNo, department, semester, division } = this.registerData;

    if (!fullName || !email || !password || !enrollmentNo || !department || !semester || !division) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    if (this.verificationError) {
      this.errorMessage = this.verificationError;
      return;
    }

    this.loading = true;

    this.authService.register(this.registerData).subscribe({
      next: () => {
        this.snackBar.open('Registration successful! Please sign in to register your face.', 'Close', { duration: 4000 });
        this.router.navigate(['/']);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
      }
    });
  }
}
