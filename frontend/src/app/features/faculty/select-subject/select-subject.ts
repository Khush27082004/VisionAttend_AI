import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubjectService } from '../../../services/subject';


@Component({
  selector: 'app-select-subject',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './select-subject.html'
})
export class SelectSubjectComponent implements OnInit {

  subjects: any[] = [];
  selectedSubject: any;

  constructor(private subjectService: SubjectService) {}

  ngOnInit(): void {
    this.subjectService.getSubjects().subscribe(res => {
      this.subjects = res;
    });
  }
}