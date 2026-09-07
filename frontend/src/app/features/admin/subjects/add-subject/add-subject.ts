import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { SubjectService } from '../../../../services/subject';
import { Faculty } from '../../../../core/services/faculty';

@Component({
  selector: 'app-add-subject',
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
    MatProgressSpinnerModule,
    MatAutocompleteModule
  ],
  templateUrl: './add-subject.html',
  styleUrls: ['./add-subject.scss']
})
export class AddSubjectComponent implements OnInit {
  private subjectService = inject(SubjectService);
  private facultyService = inject(Faculty);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  subjectData = {
    name: '',
    department: '',
    semester: '',
    facultyId: null as number | null
  };

  faculties: any[] = [];
  saving = false;

  departmentOptions: string[] = [
    'Computer Engineering',
    'Computer Science & Design',
    'Information Technology',
    'Artificial Intelligence & Data Science',
    'Electronics & Communication Engineering',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Master of Computer Applications (MCA)',
    'Bachelor of Computer Applications (BCA)'
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

  get filteredDepartments(): string[] {
    const query = (this.subjectData.department || '').toLowerCase().trim();
    if (!query) return this.departmentOptions;
    return this.departmentOptions.filter(d => d.toLowerCase().includes(query));
  }

  get filteredSubjectSuggestions(): string[] {
    const query = (this.subjectData.name || '').toLowerCase().trim();
    const sem = Number(this.subjectData.semester);
    let pool: string[] = [];

    if (sem && this.semesterSubjectCatalog[sem]) {
      pool = [...this.semesterSubjectCatalog[sem]];
      const rest = this.allCommonSubjects.filter(s => !pool.includes(s));
      pool = pool.concat(rest);
    } else {
      pool = this.allCommonSubjects;
    }

    if (!query) return pool;
    return pool.filter(s => s.toLowerCase().includes(query));
  }

  ngOnInit() {
    this.facultyService.getFaculty().subscribe({
      next: (data) => {
        this.faculties = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Could not load faculties', err);
      }
    });
  }

  save() {
    const { name, department, semester, facultyId } = this.subjectData;
    if (!name || !department || !semester || !facultyId) {
      this.snackBar.open('Please fill in all required fields.', 'Close', { duration: 3000 });
      return;
    }

    this.saving = true;
    this.subjectService.createSubject({
      ...this.subjectData,
      semester: Number(semester),
      facultyId: Number(facultyId)
    }).subscribe({
      next: () => {
        this.snackBar.open('Subject created successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/dashboard/subjects']);
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || 'Could not create subject.', 'Close', { duration: 3000 });
      }
    });
  }
}
