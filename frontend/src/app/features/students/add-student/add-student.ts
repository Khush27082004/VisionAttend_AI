import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { StudentService } from '../../../core/services/student';

@Component({
  selector: 'app-add-student',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './add-student.html',
  styleUrl: './add-student.scss'
})

export class AddStudent {

  private fb = inject(FormBuilder);
  private studentService = inject(StudentService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  saving = false;

  studentForm = this.fb.group({
    fullName:     ['', Validators.required],
    email:        ['', [Validators.required, Validators.email]],
    password:     ['', Validators.required],
    enrollmentNo: ['', Validators.required],
    department:   ['', Validators.required],
    semester:     [1, Validators.required],
    division:     ['', Validators.required],
    phone:        ['']
  });

  saveStudent() {

    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }

    this.saving = true;

    this.studentService.createStudent(this.studentForm.value).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Student added successfully!', 'Close', { duration: 3500, panelClass: ['success-snack'] });
        this.router.navigate(['/dashboard/students']);
      },
      error: (err) => {
        console.error(err);
        this.saving = false;
        this.snackBar.open('Failed to add student. Please try again.', 'Close', { duration: 4000, panelClass: ['error-snack'] });
      }
    });

  }

}