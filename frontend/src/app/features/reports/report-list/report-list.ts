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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { Attendance } from '../../../core/services/attendance';
import { SubjectService } from '../../../services/subject';
import { Faculty } from '../../../core/services/faculty';

@Component({
  selector: 'app-report-list',
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
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './report-list.html',
  styleUrl: './report-list.scss'
})
export class ReportList implements OnInit {
  private attendanceService = inject(Attendance);
  private subjectService = inject(SubjectService);
  private facultyService = inject(Faculty);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  // Filter Models
  selectedSubjectId: number | null = null;
  selectedDept = '';
  selectedSemester: number | null = null;
  selectedDivision = 'ALL';
  startDate = '';
  endDate = '';
  startDateObj: Date | null = null;
  endDateObj: Date | null = null;
  onlyDefaulters = false;
  searchQuery = '';

  // Data Sources
  subjects: any[] = [];
  uniqueDepartments: string[] = [
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
  semesterList = [1, 2, 3, 4, 5, 6, 7, 8];
  
  // Results
  loading = false;
  summary: any = null;
  students: any[] = [];
  reportGenerated = false;

  currentUserName = '';
  currentUserRole = '';
  currentFacultyDept = '';

  ngOnInit() {
    this.initDates();
    this.loadUserContext();
    this.loadSubjects();
  }

  initDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDateObj = firstDay;
    this.endDateObj = today;
    this.startDate = this.formatDate(firstDay);
    this.endDate = this.formatDate(today);
  }

  onStartDateChange() {
    if (this.startDateObj) {
      this.startDate = this.formatDate(this.startDateObj);
    }
    this.generateReport();
  }

  onEndDateChange() {
    if (this.endDateObj) {
      this.endDate = this.formatDate(this.endDateObj);
    }
    this.generateReport();
  }

  formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadUserContext() {
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.currentUserName = user.fullName ?? user.email ?? 'Faculty';
      this.currentUserRole = user.role ?? 'FACULTY';
      
      if (this.currentUserRole === 'FACULTY') {
        this.facultyService.getFaculty().subscribe({
          next: (faculties) => {
            const currentFaculty = (faculties || []).find((f: any) => f.userId === user.id);
            if (currentFaculty && currentFaculty.department) {
              this.currentFacultyDept = currentFaculty.department;
              if (!this.selectedDept) {
                this.selectedDept = currentFaculty.department;
              }
              this.cdr.detectChanges();
            }
          }
        });
      }
    } catch { /* ignore */ }
  }

  loadSubjects() {
    this.subjectService.getSubjects().subscribe({
      next: (data) => {
        this.subjects = data || [];
        // Extract distinct departments from subjects
        const depts = new Set(this.uniqueDepartments);
        this.subjects.forEach(s => {
          if (s.department) depts.add(s.department);
        });
        this.uniqueDepartments = Array.from(depts);

        // Auto select first subject if available
        if (this.subjects.length > 0 && !this.selectedSubjectId) {
          this.selectedSubjectId = this.subjects[0].id;
          this.onSubjectChange();
        } else {
          this.generateReport();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Could not load subjects for reports", err);
        this.generateReport();
      }
    });
  }

  onSubjectChange() {
    if (this.selectedSubjectId) {
      const found = this.subjects.find(s => s.id === Number(this.selectedSubjectId));
      if (found) {
        this.selectedDept = found.department;
        this.selectedSemester = found.semester;
      }
    }
    this.generateReport();
  }

  getDivisionOptions(): string[] {
    const dept = (this.selectedDept || '').toLowerCase();
    if (dept.includes('comp') || dept.includes('cse') || dept.includes('ce')) {
      return ['ALL', 'CE-1', 'CE-2', 'CE-3'];
    }
    if (dept.includes('information') || dept.includes('it')) {
      return ['ALL', 'IT-1', 'IT-2', 'IT-3'];
    }
    if (dept.includes('artific') || dept.includes('ai') || dept.includes('data')) {
      return ['ALL', 'AI-1', 'AI-2', 'AI-3'];
    }
    if (dept.includes('mech')) {
      return ['ALL', 'ME-1', 'ME-2', 'ME-3'];
    }
    if (dept.includes('civil')) {
      return ['ALL', 'CL-1', 'CL-2', 'CL-3'];
    }
    if (dept.includes('electr')) {
      return ['ALL', 'EE-1', 'EE-2', 'EE-3'];
    }
    if (dept.includes('mca')) {
      return ['ALL', 'MCA-1', 'MCA-2', 'MCA-3'];
    }
    if (dept.includes('bca')) {
      return ['ALL', 'BCA-1', 'BCA-2', 'BCA-3'];
    }
    return ['ALL', 'CE-1', 'CE-2', 'CE-3'];
  }

  // Preset Date Ranges
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

    this.generateReport();
  }

  generateReport() {
    this.loading = true;
    this.attendanceService.getClasswiseReport({
      subjectId: this.selectedSubjectId ? Number(this.selectedSubjectId) : null,
      department: this.selectedDept,
      semester: this.selectedSemester ? Number(this.selectedSemester) : null,
      division: this.selectedDivision,
      startDate: this.startDate,
      endDate: this.endDate
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.summary = res.summary;
        this.students = res.students || [];
        this.reportGenerated = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error("Report generation error", err);
        this.snackBar.open("Could not generate report. Please try again.", "Close", { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  get filteredStudents(): any[] {
    let list = this.students;

    if (this.onlyDefaulters) {
      list = list.filter(s => s.isDefaulter);
    }

    const q = (this.searchQuery || '').toLowerCase().trim();
    if (q) {
      list = list.filter(s =>
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.enrollmentNo || '').toLowerCase().includes(q) ||
        (s.division || '').toLowerCase().includes(q)
      );
    }

    return list;
  }

  resetFilters() {
    this.selectedSubjectId = this.subjects.length > 0 ? this.subjects[0].id : null;
    this.selectedDivision = 'ALL';
    this.onlyDefaulters = false;
    this.searchQuery = '';
    this.initDates();
    if (this.selectedSubjectId) {
      this.onSubjectChange();
    } else {
      this.generateReport();
    }
  }

  // Export CSV / Excel File
  exportToCSV() {
    if (this.students.length === 0) {
      this.snackBar.open("No data available to export.", "Close", { duration: 3000 });
      return;
    }

    const reportTitle = `Attendance_Report_${this.summary?.subjectName || 'Class'}_${this.startDate}_to_${this.endDate}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Build CSV Content
    let csv = `FacultyEase Ai - Class Attendance & Defaulter Report\r\n`;
    csv += `Course / Subject:,${this.summary?.subjectName || 'All'}\r\n`;
    csv += `Faculty In-Charge:,${this.summary?.facultyName || this.currentUserName}\r\n`;
    csv += `Department:,${this.summary?.department || 'All'},Semester:,${this.summary?.semester || 'All'},Division:,${this.summary?.division || 'All'}\r\n`;
    csv += `Date Range:,${this.startDate} to ${this.endDate}\r\n`;
    csv += `Total Enrolled Students:,${this.summary?.totalStudents},Total Lectures Held:,${this.summary?.totalLecturesConducted}\r\n`;
    csv += `Defaulters (< 75% Attendance):,${this.summary?.defaulterCount},Average Attendance:,${this.summary?.averagePercentage}%\r\n\r\n`;
    
    // Header Row
    csv += `Sr No,Enrollment No,Student Name,Department,Semester,Division,Lectures Attended,Total Lectures,Absent,Attendance %,Defaulter Status (< 75%)\r\n`;

    // Data Rows
    this.students.forEach((s, index) => {
      const defFlag = s.isDefaulter ? "DEFICIENT (< 75% - DEFECTIVE)" : "ELIGIBLE (>= 75%)";
      const row = [
        index + 1,
        `"${s.enrollmentNo}"`,
        `"${s.fullName}"`,
        `"${s.department}"`,
        `Sem ${s.semester}`,
        `"${s.division}"`,
        s.attendedLectures,
        s.totalLectures,
        s.absentLectures,
        `${s.percentage}%`,
        `"${defFlag}"`
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

    this.snackBar.open("Report file exported successfully!", "Close", { duration: 3000 });
  }

  // Print / Save as PDF
  printReport() {
    window.print();
  }

  seeding = false;
  loadDemoData() {
    this.seeding = true;
    this.attendanceService.seedDemoReportData().subscribe({
      next: (res) => {
        this.seeding = false;
        this.snackBar.open("Sample class attendance dataset loaded! (Defaulters & Regular students ready to test)", "Close", { duration: 4000 });
        this.loadSubjects();
        this.setPresetRange('last30');
      },
      error: (err) => {
        this.seeding = false;
        this.snackBar.open(err.error?.message || "Failed to load test data", "Close", { duration: 3000 });
      }
    });
  }
}
