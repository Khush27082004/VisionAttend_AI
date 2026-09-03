import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { SubjectService } from '../../../services/subject';
import { Attendance } from '../../../core/services/attendance';

@Component({
  selector: 'app-attendance-records', standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatIconModule, MatInputModule],
  templateUrl: './attendance-records.html', styleUrl: './attendance-records.scss'
})
export class AttendanceRecordsComponent implements OnInit {
  private subjectService = inject(SubjectService);
  private attendanceService = inject(Attendance);
  private cdr = inject(ChangeDetectorRef);

  subjects: any[] = [];
  allAttendanceRecords: any[] = [];
  filteredRecords: any[] = [];
  
  filterSubject = '';
  filterDept = '';
  filterSem = '';
  filterDiv = '';
  filterDate = '';
  searchQuery = '';

  // Sorting state
  sortColumn = '';
  sortDirection: 'asc' | 'desc' | '' = '';

  uniqueDepts: string[] = [];
  uniqueSems: number[] = [];
  uniqueDivs: string[] = [];

  ngOnInit() {
    this.subjectService.getSubjects().subscribe(subjects => {
      this.subjects = subjects;
      this.cdr.detectChanges();
    });
    this.loadAllAttendance();
  }

  loadAllAttendance() {
    this.attendanceService.getAllFacultyAttendance().subscribe({
      next: (records: any[]) => {
        this.allAttendanceRecords = records || [];
        this.extractFilterOptions();
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error(err)
    });
  }

  extractFilterOptions() {
    const depts = new Set<string>();
    const sems = new Set<number>();
    const divs = new Set<string>();

    this.allAttendanceRecords.forEach(r => {
      if (r.department) depts.add(r.department);
      if (r.semester) sems.add(Number(r.semester));
      if (r.division) divs.add(r.division);
    });

    this.uniqueDepts = Array.from(depts).sort();
    this.uniqueSems = Array.from(sems).sort((a, b) => a - b);
    this.uniqueDivs = Array.from(divs).sort();
  }

  toggleSort(column: string) {
    if (this.sortColumn === column) {
      if (this.sortDirection === 'asc') {
        this.sortDirection = 'desc';
      } else if (this.sortDirection === 'desc') {
        this.sortDirection = '';
        this.sortColumn = '';
      }
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  applyFilters() {
    let result = this.allAttendanceRecords.filter(r => {
      const matchSubject = !this.filterSubject || r.subjectName === this.filterSubject;
      const matchDept = !this.filterDept || r.department === this.filterDept;
      const matchSem = !this.filterSem || r.semester === Number(this.filterSem);
      const matchDiv = !this.filterDiv || r.division === this.filterDiv;
      
      let matchDate = true;
      if (this.filterDate) {
        const recordDateStr = new Date(r.date).toISOString().split('T')[0];
        matchDate = recordDateStr === this.filterDate;
      }

      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        r.studentName.toLowerCase().includes(q) || 
        r.enrollmentNo.toLowerCase().includes(q);

      return matchSubject && matchDept && matchSem && matchDiv && matchDate && matchSearch;
    });

    // Apply natural sorting if active
    if (this.sortColumn === 'enrollment' && this.sortDirection) {
      result.sort((a, b) => {
        const valA = a.enrollmentNo || '';
        const valB = b.enrollmentNo || '';
        const comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
        return this.sortDirection === 'asc' ? comp : -comp;
      });
    }

    this.filteredRecords = result;
  }

  resetFilters() {
    this.filterSubject = '';
    this.filterDept = '';
    this.filterSem = '';
    this.filterDiv = '';
    this.filterDate = '';
    this.searchQuery = '';
    this.sortColumn = '';
    this.sortDirection = '';
    this.applyFilters();
  }

  exportToCSV() {
    if (this.filteredRecords.length === 0) return;

    // Define CSV headers
    const headers = ['Student Name', 'Enrollment No', 'Subject', 'Department', 'Semester & Division', 'Date & Time', 'Status'];
    
    // Map records to CSV rows with double quotes escaping
    const rows = this.filteredRecords.map(r => {
      const formattedDate = new Date(r.date).toLocaleString('en-IN');
      return [
        `"${r.studentName.replace(/"/g, '""')}"`,
        `"${r.enrollmentNo.replace(/"/g, '""')}"`,
        `"${r.subjectName.replace(/"/g, '""')}"`,
        `"${r.department.replace(/"/g, '""')}"`,
        `"Sem ${r.semester} (Div ${r.division})"`,
        `"${formattedDate}"`,
        `"${r.status}"`
      ];
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Dynamic filename based on filters
    let filename = 'Attendance_Report';
    if (this.filterSubject) {
      filename += `_${this.filterSubject.replace(/\s+/g, '_')}`;
    }
    if (this.filterDate) {
      filename += `_${this.filterDate}`;
    }
    filename += '.csv';

    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
