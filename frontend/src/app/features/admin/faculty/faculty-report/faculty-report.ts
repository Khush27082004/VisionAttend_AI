import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { Attendance } from '../../../../core/services/attendance';

@Component({
  selector: 'app-faculty-report',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './faculty-report.html',
  styleUrl: './faculty-report.scss'
})
export class FacultyReportComponent implements OnInit {
  private attendanceService = inject(Attendance);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  // Filter Models
  selectedDept = 'ALL';
  startDate = '';
  endDate = '';
  startDateObj: Date | null = null;
  endDateObj: Date | null = null;
  searchQuery = '';
  statusFilter = 'ALL'; // 'ALL' | 'PROXY_CONDUCTED' | 'ON_LEAVE' | 'HIGH'

  departmentList: string[] = [
    'ALL',
    'Computer Science & Engineering',
    'Computer Engineering',
    'Information Technology',
    'Artificial Intelligence & Data Science',
    'Electronics & Communication Engineering',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'MCA',
    'BCA'
  ];

  // Data
  loading = false;
  seeding = false;
  summary: any = null;
  faculties: any[] = [];
  expandedFacultyId: number | null = null;

  ngOnInit() {
    this.initDates();
    this.loadReport();
  }

  initDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDateObj = firstDay;
    this.endDateObj = today;
    this.startDate = this.formatDate(firstDay);
    this.endDate = this.formatDate(today);
  }

  formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onStartDateChange() {
    if (this.startDateObj) {
      this.startDate = this.formatDate(this.startDateObj);
    }
    this.loadReport();
  }

  onEndDateChange() {
    if (this.endDateObj) {
      this.endDate = this.formatDate(this.endDateObj);
    }
    this.loadReport();
  }

  setPresetRange(preset: 'thisMonth' | 'last30' | 'semester' | 'today') {
    const today = new Date();
    this.endDateObj = today;
    this.endDate = this.formatDate(today);

    if (preset === 'today') {
      this.startDateObj = today;
      this.startDate = this.formatDate(today);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      this.startDateObj = firstDay;
      this.startDate = this.formatDate(firstDay);
    } else if (preset === 'last30') {
      const past30 = new Date(today);
      past30.setDate(today.getDate() - 30);
      this.startDateObj = past30;
      this.startDate = this.formatDate(past30);
    } else if (preset === 'semester') {
      const semStart = new Date(today);
      semStart.setMonth(today.getMonth() - 4);
      this.startDateObj = semStart;
      this.startDate = this.formatDate(semStart);
    }

    this.loadReport();
  }

  loadReport() {
    this.loading = true;
    this.attendanceService.getFacultyWorkloadReport({
      department: this.selectedDept,
      startDate: this.startDate,
      endDate: this.endDate
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.summary = res.summary;
        this.faculties = res.faculties || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error("Error loading faculty workload report:", err);
        this.snackBar.open("Could not load faculty report.", "Close", { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  get filteredFaculties(): any[] {
    let list = this.faculties;

    if (this.statusFilter === 'PROXY_CONDUCTED') {
      list = list.filter(f => f.proxyConductedCount > 0);
    } else if (this.statusFilter === 'ON_LEAVE') {
      list = list.filter(f => f.proxyReceivedCount > 0);
    } else if (this.statusFilter === 'HIGH') {
      list = list.filter(f => f.totalLecturesTaught >= 5);
    }

    const q = (this.searchQuery || '').toLowerCase().trim();
    if (q) {
      list = list.filter(f =>
        (f.fullName || '').toLowerCase().includes(q) ||
        (f.employeeId || '').toLowerCase().includes(q) ||
        (f.department || '').toLowerCase().includes(q) ||
        (f.designation || '').toLowerCase().includes(q)
      );
    }

    return list;
  }

  toggleDetails(facultyId: number) {
    if (this.expandedFacultyId === facultyId) {
      this.expandedFacultyId = null;
    } else {
      this.expandedFacultyId = facultyId;
    }
  }

  resetFilters() {
    this.selectedDept = 'ALL';
    this.statusFilter = 'ALL';
    this.searchQuery = '';
    this.expandedFacultyId = null;
    this.initDates();
    this.loadReport();
  }

  loadDemoData() {
    this.seeding = true;
    this.attendanceService.seedDemoReportData().subscribe({
      next: () => {
        this.seeding = false;
        this.snackBar.open("Demo faculty teaching logs & proxy activity seeded successfully!", "Close", { duration: 4000 });
        this.setPresetRange('last30');
      },
      error: (err) => {
        this.seeding = false;
        this.snackBar.open(err.error?.message || "Failed to load test data", "Close", { duration: 3000 });
      }
    });
  }

  exportToCSV() {
    if (this.faculties.length === 0) {
      this.snackBar.open("No data to export.", "Close", { duration: 3000 });
      return;
    }

    const reportTitle = `Faculty_Activity_Report_${this.startDate}_to_${this.endDate}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    let csv = `FacultyEase Ai - Faculty Teaching & Proxy Workload Audit Report\r\n`;
    csv += `Department Filter:,${this.selectedDept}\r\n`;
    csv += `Date Range:,${this.startDate} to ${this.endDate}\r\n`;
    csv += `Total Faculty Members:,${this.summary?.totalFaculty},Total Regular Lectures:,${this.summary?.totalRegularLectures}\r\n`;
    csv += `Total Proxy Lectures Conducted:,${this.summary?.totalProxyLectures},Total Leaves/Absences Covered:,${this.summary?.totalLeaveInstances}\r\n\r\n`;
    
    csv += `Sr No,Employee ID,Faculty Name,Department,Designation,Assigned Courses,Regular Lectures Taken,Proxy Lectures Conducted,Leaves / Proxy Received,Total Lectures Taught,Workload Status\r\n`;

    this.faculties.forEach((f, idx) => {
      const coursesStr = (f.subjects || []).join(' | ');
      const row = [
        idx + 1,
        `"${f.employeeId}"`,
        `"${f.fullName}"`,
        `"${f.department}"`,
        `"${f.designation}"`,
        `"${coursesStr}"`,
        f.regularLecturesCount,
        f.proxyConductedCount,
        f.proxyReceivedCount,
        f.totalLecturesTaught,
        `"${f.workloadStatus}"`
      ];
      csv += row.join(',') + '\r\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.snackBar.open("Faculty report exported successfully!", "Close", { duration: 3000 });
  }

  printReport() {
    window.print();
  }
}
