import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class SubjectService {

  private api = 'http://localhost:5000/subjects';

  constructor(private http: HttpClient) {}

  getSubjects(facultyId?: number, all?: boolean): Observable<any> {
    let params: string[] = [];
    if (facultyId) params.push(`facultyId=${facultyId}`);
    if (all) params.push(`all=true`);
    const query = params.length ? `?${params.join('&')}` : '';
    return this.http.get(`${this.api}${query}`);
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