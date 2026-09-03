import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class SubjectService {

  private api = 'http://localhost:5000/subjects';

  constructor(private http: HttpClient) {}

  getSubjects(): Observable<any> {
    return this.http.get(this.api);
  }

  createSubject(data: any): Observable<any> {
    return this.http.post(this.api, data);
  }

  getEnrolledStudents(subjectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/${subjectId}/students`);
  }

  deleteSubject(id: number): Observable<any> {
    return this.http.delete<any>(`${this.api}/${id}`);
  }
}