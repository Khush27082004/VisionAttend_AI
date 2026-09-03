import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
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
  showPassword = false;
  errorMessage = '';
  currentYear = new Date().getFullYear();

  register() {
    this.errorMessage = '';

    const { fullName, email, password, enrollmentNo, department, semester, division } = this.registerData;

    if (!fullName || !email || !password || !enrollmentNo || !department || !semester || !division) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.loading = true;

    this.authService.register(this.registerData).subscribe({
      next: () => {
        this.snackBar.open('Registration successful! Please log in.', 'Close', { duration: 4000 });
        this.router.navigate(['/']);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
      }
    });
  }
}
