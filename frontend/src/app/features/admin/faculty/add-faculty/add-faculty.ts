import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Faculty } from '../../../../core/services/faculty';

@Component({
  selector: 'app-add-faculty',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './add-faculty.html',
  styleUrls: ['./add-faculty.scss']
})
export class AddFacultyComponent {
  private facultyService = inject(Faculty);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  departments: string[] = [
    'Computer Engineering',
    'Computer Science & Design',
    'Information Technology',
    'Artificial Intelligence & Data Science',
    'Electronics & Communication Engineering',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Master of Computer Applications (MCA)',
    'Bachelor of Computer Applications (BCA)'
  ];

  facultyData = {
    fullName: '',
    email: '',
    password: '',
    employeeId: '',
    department: 'Computer Engineering',
    designation: 'Assistant Professor'
  };

  saving = false;
  showPassword = false;

  save() {
    const { fullName, email, password, employeeId, department } = this.facultyData;
    if (!fullName || !email || !password || !employeeId || !department) {
      this.snackBar.open('Please fill in all required fields.', 'Close', { duration: 3000 });
      return;
    }

    this.saving = true;
    this.facultyService.createFaculty(this.facultyData).subscribe({
      next: () => {
        this.snackBar.open('Faculty member created successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/dashboard/admin/faculty']);
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || 'Could not create faculty member.', 'Close', { duration: 3000 });
      }
    });
  }
}
