import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Faculty } from '../../../../core/services/faculty';

@Component({
  selector: 'app-faculty-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule],
  templateUrl: './faculty-list.html',
  styleUrls: ['./faculty-list.scss']
})
export class FacultyListComponent implements OnInit {
  private facultyService = inject(Faculty);
  private cdr = inject(ChangeDetectorRef);

  faculties: any[] = [];
  loading = true;

  ngOnInit() {
    this.loadFaculty();
  }

  loadFaculty() {
    this.facultyService.getFaculty().subscribe({
      next: (data) => {
        this.faculties = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Could not load faculty', err);
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
