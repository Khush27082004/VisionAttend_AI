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
  activeTab: 'csv' | 'manual' = 'csv';

  // CSV Bulk Upload state
  parsedStudents: Partial<RosterEntry>[] = [];
  csvFileName = '';
  importingCsv = false;
  csvError = '';

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
        this.cdr.detectChanges();
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
    this.cdr.detectChanges();
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.csvFileName = file.name;
    this.csvError = '';
    this.parsedStudents = [];

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      this.parseCsvContent(text);
    };
    reader.onerror = () => {
      this.csvError = 'Failed to read file. Please try a standard CSV format.';
      this.cdr.detectChanges();
    };
    reader.readAsText(file);
  }

  parseCsvContent(content: string) {
    try {
      const lines = content.split(/\r\n|\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        this.csvError = 'The uploaded CSV file is empty or has no data rows.';
        this.cdr.detectChanges();
        return;
      }

      // Detect separator (, or ;)
      const headerLine = lines[0];
      const separator = headerLine.includes(';') ? ';' : ',';
      
      const headers = headerLine.split(separator).map(h => h.replace(/["']/g, '').trim().toLowerCase());

      // Helper to find header index
      const findIndex = (possibleNames: string[]) => {
        return headers.findIndex(h => possibleNames.some(p => h.includes(p)));
      };

      const nameIdx = findIndex(['name', 'full name', 'student name']);
      const enrollIdx = findIndex(['enrollment', 'enrollment no', 'enrollmentno', 'enrolment', 'roll no', 'id']);
      const deptIdx = findIndex(['department', 'dept', 'branch', 'course']);
      const semIdx = findIndex(['semester', 'sem']);
      const divIdx = findIndex(['division', 'div', 'class', 'section']);
      const emailIdx = findIndex(['email', 'mail', 'e-mail']);

      if (enrollIdx === -1 || nameIdx === -1) {
        this.csvError = 'Could not find required columns. Please include "Name" and "Enrollment" columns in the CSV.';
        this.cdr.detectChanges();
        return;
      }

      const parsed: Partial<RosterEntry>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rowLine = lines[i];
        if (!rowLine.trim()) continue;

        // Split while handling quoted values
        const regex = new RegExp(`(?:^|${separator})(?:"([^"]*)"|([^${separator}]*))`, 'g');
        const cols: string[] = [];
        let match;
        while ((match = regex.exec(rowLine)) !== null) {
          cols.push((match[1] || match[2] || '').trim());
        }

        const fullName = nameIdx !== -1 ? cols[nameIdx] || '' : '';
        const enrollmentNo = enrollIdx !== -1 ? (cols[enrollIdx] || '').toUpperCase() : '';
        const department = deptIdx !== -1 ? cols[deptIdx] || 'Computer Engineering' : 'Computer Engineering';
        const semVal = semIdx !== -1 ? parseInt(cols[semIdx] || '1', 10) : 1;
        const division = divIdx !== -1 ? (cols[divIdx] || 'A').toUpperCase() : 'A';
        const email = emailIdx !== -1 ? cols[emailIdx] || '' : '';

        if (fullName && enrollmentNo) {
          parsed.push({
            fullName,
            enrollmentNo,
            department: department || 'Computer Engineering',
            semester: isNaN(semVal) ? 1 : semVal,
            division: division || 'A',
            email: email || undefined
          });
        }
      }

      if (parsed.length === 0) {
        this.csvError = 'No valid student rows could be extracted from the file.';
      } else {
        this.parsedStudents = parsed;
        this.csvError = '';
      }
      this.cdr.detectChanges();
    } catch (err: any) {
      this.csvError = 'Error parsing CSV: ' + (err.message || 'Invalid format');
      this.cdr.detectChanges();
    }
  }

  importParsedStudents() {
    if (this.parsedStudents.length === 0) return;

    this.importingCsv = true;
    this.cdr.detectChanges();

    this.rosterService.bulkAddStudents(this.parsedStudents).subscribe({
      next: (res) => {
        this.importingCsv = false;
        this.snackBar.open(res.message || `Successfully imported ${this.parsedStudents.length} students!`, 'Close', { duration: 4000 });
        this.parsedStudents = [];
        this.csvFileName = '';
        this.showAddForm = false;
        this.loadRoster();
      },
      error: (err) => {
        this.importingCsv = false;
        this.snackBar.open(err.error?.message || 'Failed to import student list.', 'Close', { duration: 4000 });
        this.cdr.detectChanges();
      }
    });
  }

  downloadSampleCsv() {
    const csvContent = 
`Full Name,Enrollment No,Department,Semester,Division,Email
Aarav Sharma,230410116001,Computer Engineering,5,A,aarav.sharma@college.edu
Diya Patel,230410116002,Information Technology,5,B,diya.patel@college.edu
Rohan Mehta,230410116003,Computer Engineering,6,A,rohan.mehta@college.edu
Ananya Iyer,230410116004,AI & Data Science,4,A,ananya.iyer@college.edu
Maitra Patel,230410116092,Information Technology,7,C,maitra.patel@college.edu`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_roster_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  saveStudent() {
    if (!this.newStudent.fullName || !this.newStudent.enrollmentNo || !this.newStudent.department || !this.newStudent.semester) {
      this.snackBar.open('Please fill in Full Name, Enrollment No, Department and Semester.', 'Close', { duration: 3000 });
      return;
    }

    this.addingStudent = true;
    this.cdr.detectChanges();

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
          division: 'CE-1',
          email: ''
        };
        this.loadRoster();
      },
      error: (err) => {
        this.addingStudent = false;
        this.snackBar.open(err.error?.message || 'Failed to add student to roster.', 'Close', { duration: 3500 });
        this.cdr.detectChanges();
      }
    });
  }

  syncExisting() {
    this.syncing = true;
    this.cdr.detectChanges();

    this.rosterService.syncExistingStudents().subscribe({
      next: (res) => {
        this.syncing = false;
        this.snackBar.open(res.message || 'Existing students synchronized successfully.', 'Close', { duration: 3500 });
        this.loadRoster();
      },
      error: (err) => {
        this.syncing = false;
        this.snackBar.open('Sync failed. Please try again.', 'Close', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  clearAllRoster() {
    if (confirm('Are you sure you want to completely clear the Master Student Roster? All pre-authorized enrollment numbers will be removed.')) {
      this.rosterService.clearAllRoster().subscribe({
        next: (res) => {
          this.snackBar.open(res.message || 'Master roster cleared successfully.', 'Close', { duration: 3000 });
          this.loadRoster();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Could not clear master roster.', 'Close', { duration: 3000 });
        }
      });
    }
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
          this.cdr.detectChanges();
        }
      });
    }
  }
}
