import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { SubjectService } from '../../../services/subject';

@Component({
  selector: 'app-faculty-subjects',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatSelectModule
  ],
  templateUrl: './faculty-subjects.html',
  styleUrl: './faculty-subjects.scss'
})
export class FacultySubjectsComponent implements OnInit {
  private subjectService = inject(SubjectService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  subjects: any[] = [];

  // Form Fields
  name = '';
  department = '';
  semester: number | null = null;
  division = '';
  selectedDay = '';
  lectureTime = '';

  ngOnInit() {
    this.loadSubjects();
  }

  loadSubjects() {
    this.subjectService.getSubjects().subscribe({
      next: (data) => {
        this.subjects = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Could not load subjects", err);
      }
    });
  }

  saveSubject() {
    if (!this.name || !this.department || !this.semester) {
      this.snackBar.open("Please fill in Name, Department, and Semester", "Close", { duration: 3000 });
      return;
    }

    // Format subject name with scheduling/division details if provided
    let finalName = this.name.trim();
    const details: string[] = [];
    if (this.division.trim()) details.push(this.division.trim());

    let timeSlotStr = '';
    const formattedTime = this.lectureTime.trim();
    if (formattedTime) {
      timeSlotStr = [this.selectedDay, formattedTime].filter(Boolean).join(' ');
    } else if (this.selectedDay) {
      timeSlotStr = this.selectedDay;
    }

    if (timeSlotStr) {
      details.push(timeSlotStr);
    }
    
    if (details.length > 0) {
      finalName = `${finalName} (${details.join(' - ')})`;
    }

    this.subjectService.createSubject({
      name: finalName,
      department: this.department.trim(),
      semester: Number(this.semester)
    }).subscribe({
      next: () => {
        this.snackBar.open("Subject created successfully!", "Close", { duration: 3000 });
        this.clearForm();
        this.loadSubjects();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || "Failed to create subject", "Close", { duration: 3000 });
      }
    });
  }

  deleteSubject(id: number) {
    if (confirm("Are you sure you want to delete this subject? This will delete all associated attendance records as well.")) {
      this.subjectService.deleteSubject(id).subscribe({
        next: (res) => {
          this.snackBar.open("Subject deleted successfully", "Close", { duration: 3000 });
          this.loadSubjects();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || "Failed to delete subject", "Close", { duration: 3000 });
        }
      });
    }
  }

  clearForm() {
    this.name = '';
    this.department = '';
    this.semester = null;
    this.division = '';
    this.selectedDay = '';
    this.lectureTime = '';
  }
}
