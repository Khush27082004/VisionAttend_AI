import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { RosterService, RosterEntry } from '../../../../services/roster';

@Component({
  selector: 'app-master-roster',
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
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './master-roster.html',
  styleUrls: ['./master-roster.scss']
})
export class MasterRosterComponent implements OnInit {
  private rosterService = inject(RosterService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  roster: RosterEntry[] = [];
  filteredRoster: RosterEntry[] = [];
  loading = false;
  syncing = false;
  addingStudent = false;
  showAddForm = false;

  stats = {
    total: 0,
    claimed: 0,
    pending: 0
  };

  searchQuery = '';
  filterStatus = 'all'; // 'all' | 'claimed' | 'pending'
  filterDept = '';

  newStudent: Partial<RosterEntry> = {
    fullName: '',
    enrollmentNo: '',
    department: 'Computer Engineering',
    semester: 5,
    division: 'A',
    email: ''
  };

  ngOnInit() {
    this.loadRoster();
  }

  loadRoster() {
    this.loading = true;
    this.rosterService.getRoster().subscribe({
      next: (res) => {
        this.roster = res.roster || [];
        this.stats = res.stats || { total: 0, claimed: 0, pending: 0 };
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading roster:', err);
      }
    });
  }

  applyFilters() {
    const q = this.searchQuery.toLowerCase().trim();

    this.filteredRoster = this.roster.filter(item => {
      const matchSearch = !q || 
        item.fullName.toLowerCase().includes(q) || 
        item.enrollmentNo.toLowerCase().includes(q) ||
        (item.department && item.department.toLowerCase().includes(q));

      let matchStatus = true;
      if (this.filterStatus === 'claimed') matchStatus = item.isClaimed;
      if (this.filterStatus === 'pending') matchStatus = !item.isClaimed;

      const matchDept = !this.filterDept || item.department === this.filterDept;

      return matchSearch && matchStatus && matchDept;
    });
  }

  saveStudent() {
    if (!this.newStudent.fullName || !this.newStudent.enrollmentNo || !this.newStudent.department || !this.newStudent.semester) {
      this.snackBar.open('Please fill in Full Name, Enrollment No, Department and Semester.', 'Close', { duration: 3000 });
      return;
    }

    this.addingStudent = true;
    this.rosterService.addStudent(this.newStudent).subscribe({
      next: (res) => {
        this.addingStudent = false;
        this.snackBar.open(res.message || 'Student added to Master Roster!', 'Close', { duration: 3000 });
        this.showAddForm = false;
        this.newStudent = {
          fullName: '',
          enrollmentNo: '',
          department: 'Computer Engineering',
          semester: 5,
          division: 'A',
          email: ''
        };
        this.loadRoster();
      },
      error: (err) => {
        this.addingStudent = false;
        this.snackBar.open(err.error?.message || 'Failed to add student to roster.', 'Close', { duration: 3500 });
      }
    });
  }

  syncExisting() {
    this.syncing = true;
    this.rosterService.syncExistingStudents().subscribe({
      next: (res) => {
        this.syncing = false;
        this.snackBar.open(res.message || 'Existing students synchronized successfully.', 'Close', { duration: 3500 });
        this.loadRoster();
      },
      error: (err) => {
        this.syncing = false;
        this.snackBar.open('Sync failed. Please try again.', 'Close', { duration: 3000 });
      }
    });
  }

  deleteEntry(id: number) {
    if (confirm('Are you sure you want to remove this student from the Master Roster?')) {
      this.rosterService.deleteStudent(id).subscribe({
        next: (res) => {
          this.snackBar.open(res.message || 'Student removed from Master Roster.', 'Close', { duration: 3000 });
          this.loadRoster();
        },
        error: (err) => {
          this.snackBar.open('Could not delete roster entry.', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
