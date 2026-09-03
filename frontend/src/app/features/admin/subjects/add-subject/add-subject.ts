import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SubjectService } from '../../../../services/subject';
import { Faculty } from '../../../../core/services/faculty';

@Component({
  selector: 'app-add-subject',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './add-subject.html',
  styleUrls: ['./add-subject.scss']
})
export class AddSubjectComponent implements OnInit {
  private subjectService = inject(SubjectService);
  private facultyService = inject(Faculty);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  subjectData = {
    name: '',
    department: '',
    semester: '',
    facultyId: null as number | null
  };

  faculties: any[] = [];
  saving = false;

  ngOnInit() {
    this.facultyService.getFaculty().subscribe({
      next: (data) => {
        this.faculties = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Could not load faculties', err);
      }
    });
  }

  save() {
    const { name, department, semester, facultyId } = this.subjectData;
    if (!name || !department || !semester || !facultyId) {
      this.snackBar.open('Please fill in all required fields.', 'Close', { duration: 3000 });
      return;
    }

    this.saving = true;
    this.subjectService.createSubject({
      ...this.subjectData,
      semester: Number(semester),
      facultyId: Number(facultyId)
    }).subscribe({
      next: () => {
        this.snackBar.open('Subject created successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/dashboard/subjects']);
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || 'Could not create subject.', 'Close', { duration: 3000 });
      }
    });
  }
}
