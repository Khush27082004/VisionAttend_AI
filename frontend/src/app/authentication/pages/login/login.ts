import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {

  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loginData = { email: '', password: '' };
  loading = false;
  showPassword = false;
  errorMessage = '';
  currentYear = new Date().getFullYear();

  login() {
    this.errorMessage = '';

    const cleanEmail = (this.loginData.email || '').trim().toLowerCase();
    const cleanPassword = (this.loginData.password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      this.errorMessage = 'Please enter your email and password.';
      return;
    }

    this.loading = true;

    this.authService.login({ email: cleanEmail, password: cleanPassword }).subscribe({
      next: (response: any) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.loading = false;
        this.cdr.detectChanges();

        switch (response.user.role) {
          case 'ADMIN':
            this.router.navigate(['/dashboard']);
            break;
          case 'FACULTY':
            this.router.navigate(['/dashboard/faculty']);
            break;
          case 'STUDENT':
            this.router.navigate(['/dashboard/student']);
            break;
          default:
            this.router.navigate(['/dashboard']);
            break;
        }
      },
      error: (err: any) => {
        console.error('Login error:', err);
        this.loading = false;
        this.errorMessage = err.error?.message || 'Invalid email or password. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}