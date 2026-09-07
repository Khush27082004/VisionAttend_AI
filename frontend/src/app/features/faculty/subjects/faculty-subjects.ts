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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { SubjectService } from '../../../services/subject';
import { Faculty } from '../../../core/services/faculty';

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
    MatSelectModule,
    MatAutocompleteModule
  ],
  templateUrl: './faculty-subjects.html',
  styleUrl: './faculty-subjects.scss'
})
export class FacultySubjectsComponent implements OnInit {
  private subjectService = inject(SubjectService);
  private facultyService = inject(Faculty);
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

  // Metadata Catalogs
  departmentOptions: string[] = [
    'Computer Engineering',
    'Information Technology',
    'Artificial Intelligence & Data Science',
    'Computer Science & Engineering',
    'Electronics & Communication Engineering',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Master of Computer Applications (MCA)',
    'Bachelor of Computer Applications (BCA)',
    'Data Science & Analytics',
    'Cyber Security & Forensics'
  ];

  semesterOptions = [
    { label: 'Semester 1', value: 1 },
    { label: 'Semester 2', value: 2 },
    { label: 'Semester 3', value: 3 },
    { label: 'Semester 4', value: 4 },
    { label: 'Semester 5', value: 5 },
    { label: 'Semester 6', value: 6 },
    { label: 'Semester 7', value: 7 },
    { label: 'Semester 8', value: 8 }
  ];

  divisionOptions: string[] = [
    'Div A',
    'Div B',
    'Div C',
    'Div D',
    'IT-1',
    'IT-2',
    'CE-1',
    'CE-2',
    'AI-1',
    'AI-2',
    'Batch 1',
    'Batch 2',
    'Class A',
    'Class B'
  ];

  timeSlotOptions: string[] = [
    '08:00 AM - 09:00 AM',
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '10:30 AM - 11:30 AM',
    '11:00 AM - 12:00 PM',
    '11:30 AM - 12:30 PM',
    '12:30 PM - 01:30 PM',
    '01:30 PM - 02:30 PM',
    '02:00 PM - 03:00 PM',
    '02:30 PM - 03:30 PM',
    '03:30 PM - 04:30 PM',
    '04:30 PM - 05:30 PM'
  ];

  semesterSubjectCatalog: Record<number, string[]> = {
    1: [
      'Programming for Problem Solving (C)',
      'Engineering Mathematics-I',
      'Basic Electrical Engineering',
      'Engineering Physics',
      'Communication Skills',
      'Engineering Graphics & Design'
    ],
    2: [
      'Object-Oriented Programming (C++)',
      'Engineering Mathematics-II',
      'Basic Electronics',
      'Engineering Chemistry',
      'Environmental Studies',
      'Basic Mechanical Engineering'
    ],
    3: [
      'Data Structures & Algorithms',
      'Digital Logic & Circuit Design',
      'Database Management Systems (DBMS)',
      'Discrete Mathematics',
      'Computer Organization & Architecture',
      'Object-Oriented Programming with Java'
    ],
    4: [
      'Operating Systems',
      'Computer Networks',
      'Design & Analysis of Algorithms (DAA)',
      'Python Programming',
      'Software Engineering Principles',
      'Microprocessor & Microcontrollers'
    ],
    5: [
      'Web Development Technologies',
      'Theory of Computation (Automata)',
      'Artificial Intelligence',
      'Information Security',
      'Database Administration',
      'Computer Graphics'
    ],
    6: [
      'Machine Learning',
      'Advanced Web Technologies',
      'Cloud Computing',
      'Cryptography & Network Security',
      'Mobile Application Development',
      'Compiler Design',
      'Internet of Things (IoT)'
    ],
    7: [
      'Deep Learning & Neural Networks',
      'Big Data Analytics',
      'Natural Language Processing (NLP)',
      'DevOps & Continuous Delivery',
      'Cyber Security & Digital Forensics',
      'Full Stack Web Development'
    ],
    8: [
      'High Performance Computing',
      'Blockchain Technology',
      'Distributed Systems',
      'Major Project & Dissertation',
      'Augmented & Virtual Reality'
    ]
  };

  allCommonSubjects: string[] = [
    'Data Structures & Algorithms',
    'Database Management Systems',
    'Operating Systems',
    'Computer Networks',
    'Machine Learning',
    'Artificial Intelligence',
    'Software Engineering',
    'Web Development Technologies',
    'Cloud Computing',
    'Cyber Security & Cryptography',
    'Mobile Application Development',
    'Python Programming',
    'Java Programming',
    'Deep Learning',
    'Internet of Things (IoT)',
    'DevOps Engineering',
    'Blockchain Technology',
    'Discrete Mathematics',
    'Computer Organization & Architecture',
    'Compiler Design',
    'Big Data Analytics'
  ];

  ngOnInit() {
    this.loadSubjects();
    this.detectFacultyDepartment();
  }

  detectFacultyDepartment() {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        this.facultyService.getFaculty().subscribe({
          next: (faculties) => {
            const currentFaculty = (faculties || []).find((f: any) => f.userId === user.id);
            if (currentFaculty && currentFaculty.department && !this.department) {
              this.department = currentFaculty.department;
              this.cdr.detectChanges();
            }
          },
          error: () => {}
        });
      } catch (e) {
        console.error("Error detecting faculty department", e);
      }
    }
  }

  get filteredDepartments(): string[] {
    const query = (this.department || '').toLowerCase().trim();
    if (!query) return this.departmentOptions;
    return this.departmentOptions.filter(d => d.toLowerCase().includes(query));
  }

  get filteredDivisions(): string[] {
    const query = (this.division || '').toLowerCase().trim();
    if (!query) return this.divisionOptions;
    return this.divisionOptions.filter(d => d.toLowerCase().includes(query));
  }

  get filteredTimeSlots(): string[] {
    const query = (this.lectureTime || '').toLowerCase().trim();
    if (!query) return this.timeSlotOptions;
    return this.timeSlotOptions.filter(t => t.toLowerCase().includes(query));
  }

  get filteredSubjectSuggestions(): string[] {
    const query = (this.name || '').toLowerCase().trim();
    let pool: string[] = [];

    if (this.semester && this.semesterSubjectCatalog[this.semester]) {
      pool = [...this.semesterSubjectCatalog[this.semester]];
      const rest = this.allCommonSubjects.filter(s => !pool.includes(s));
      pool = pool.concat(rest);
    } else {
      pool = this.allCommonSubjects;
    }

    if (!query) return pool;
    return pool.filter(s => s.toLowerCase().includes(query));
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
      this.snackBar.open("Please select or fill in Subject Name, Department, and Semester", "Close", { duration: 3000 });
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
    this.detectFacultyDepartment();
  }
}

