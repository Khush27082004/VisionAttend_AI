import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { SubjectService } from '../../../../services/subject';

@Component({
  selector: 'app-subject-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule],
  templateUrl: './subject-list.html',
  styleUrls: ['./subject-list.scss']
})
export class SubjectListComponent implements OnInit {
  private subjectService = inject(SubjectService);
  private cdr = inject(ChangeDetectorRef);

  subjects: any[] = [];
  loading = true;

  ngOnInit() {
    this.loadSubjects();
  }

  loadSubjects() {
    this.subjectService.getSubjects().subscribe({
      next: (data) => {
        this.subjects = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Could not load subjects', err);
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
