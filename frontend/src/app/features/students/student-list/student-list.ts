import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { StudentService } from '../../../core/services/student';

@Component({
  selector: 'app-student-list', standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule],
  templateUrl: './student-list.html', styleUrl: './student-list.scss'
})
export class StudentList implements OnInit {
  private studentService = inject(StudentService);
  private cdr = inject(ChangeDetectorRef);
  students: any[] = [];
  loading = true;

  ngOnInit() { this.loadStudents(); }

  loadStudents() {
    this.studentService.getStudents().subscribe({
      next: students => { 
        this.students = students || []; 
        this.loading = false; 
        this.cdr.detectChanges();
      },
      error: err => { 
        console.error(err); 
        this.loading = false; 
        this.cdr.detectChanges();
      },
      complete: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
