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

  getDivisionSuggestionsForDepartment(dept: string): string[] {
    const d = (dept || '').toLowerCase().trim();
    if (!d) {
      return [
        'Div A', 'Div B', 'Div C', 'Div D',
        'CE-1', 'CE-2', 'CE-3',
        'IT-1', 'IT-2', 'IT-3',
        'AI-1', 'AI-2', 'CSE-1', 'CSE-2'
      ];
    }

    // 1. Computer Engineering / Computer Science / CSE / CE
    if (d.includes('comp') || d.includes('cse') || d.includes('ce') || d.includes('software')) {
      return [
        'CE-1', 'CE-2', 'CE-3', 'CE-4',
        'CSE-1', 'CSE-2', 'CSE-3',
        'Div A', 'Div B', 'Div C', 'Div D',
        'Batch 1', 'Batch 2'
      ];
    }

    // 2. Information Technology / IT
    if (d.includes('information') || d.includes('it') || d.includes('infotech')) {
      return [
        'IT-1', 'IT-2', 'IT-3', 'IT-4',
        'Div A', 'Div B', 'Div C', 'Div D',
        'Batch 1', 'Batch 2'
      ];
    }

    // 3. AI / Data Science / AIML / AIDS
    if (d.includes('artific') || d.includes('ai') || d.includes('data science') || d.includes('ml')) {
      return [
        'AI-1', 'AI-2', 'AI-3',
        'AIDS-1', 'AIDS-2',
        'AIML-1', 'AIML-2',
        'DS-1', 'DS-2',
        'Div A', 'Div B', 'Div C'
      ];
    }

    // 4. Electronics / EC / ECE / Telecom
    if (d.includes('electron') || d.includes('ec') || d.includes('ece') || d.includes('telecom')) {
      return [
        'EC-1', 'EC-2', 'EC-3',
        'ECE-1', 'ECE-2',
        'Div A', 'Div B', 'Div C'
      ];
    }

    // 5. Electrical / EE / EEE
    if (d.includes('electr') || d.includes('ee') || d.includes('eee')) {
      return [
        'EE-1', 'EE-2', 'EE-3',
        'EEE-1', 'EEE-2',
        'Div A', 'Div B', 'Div C'
      ];
    }

    // 6. Mechanical / ME
    if (d.includes('mech') || d.includes('me')) {
      return [
        'ME-1', 'ME-2', 'ME-3', 'ME-4',
        'Div A', 'Div B', 'Div C', 'Div D'
      ];
    }

    // 7. Civil / CL
    if (d.includes('civil') || d.includes('cl')) {
      return [
        'CL-1', 'CL-2', 'CL-3',
        'Civil-1', 'Civil-2',
        'Div A', 'Div B', 'Div C'
      ];
    }

    // 8. Chemical / CH
    if (d.includes('chem') || d.includes('ch')) {
      return [
        'CH-1', 'CH-2', 'CH-3',
        'Div A', 'Div B', 'Div C'
      ];
    }

    // 9. MCA
    if (d.includes('mca') || d.includes('master of computer')) {
      return [
        'MCA-1', 'MCA-2', 'MCA-3',
        'MCA-A', 'MCA-B',
        'Div A', 'Div B'
      ];
    }

    // 10. BCA
    if (d.includes('bca') || d.includes('bachelor of computer')) {
      return [
        'BCA-1', 'BCA-2', 'BCA-3',
        'BCA-A', 'BCA-B',
        'Div A', 'Div B', 'Div C'
      ];
    }

    // 11. Cyber Security
    if (d.includes('cyber') || d.includes('forensic')) {
      return [
        'CS-1', 'CS-2', 'CS-3',
        'Cyber-1', 'Cyber-2',
        'Div A', 'Div B', 'Div C'
      ];
    }

    // 12. Automobile / AE
    if (d.includes('auto') || d.includes('ae')) {
      return [
        'AE-1', 'AE-2', 'AE-3',
        'Div A', 'Div B'
      ];
    }

    // Fallback: Generate smart abbreviation from department words + Div A, B, C
    const words = dept.trim().split(/\s+/);
    let abbr = words.map(w => w[0]?.toUpperCase()).join('');
    if (abbr.length > 4) abbr = abbr.substring(0, 3);
    if (abbr) {
      return [
        `${abbr}-1`, `${abbr}-2`, `${abbr}-3`,
        'Div A', 'Div B', 'Div C', 'Div D'
      ];
    }

    return ['Div A', 'Div B', 'Div C', 'Div D', 'Batch 1', 'Batch 2'];
  }

  get filteredDepartments(): string[] {
    const query = (this.department || '').toLowerCase().trim();
    if (!query) return this.departmentOptions;
    return this.departmentOptions.filter(d => d.toLowerCase().includes(query));
  }

  get filteredDivisions(): string[] {
    const query = (this.division || '').toLowerCase().trim();
    const options = this.getDivisionSuggestionsForDepartment(this.department);
    if (!query) return options;
    return options.filter(d => d.toLowerCase().includes(query));
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

