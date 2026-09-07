import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private http = inject(HttpClient);
  private api = 'http://localhost:5000/students';

  createStudent(data: unknown) { return this.http.post(this.api, data); }
  getStudents() { return this.http.get<any[]>(this.api); }
  getProfile() { return this.http.get<any>(`${this.api}/profile`); }
  getDashboardSummary() { return this.http.get<any>(`${this.api}/dashboard-summary`); }
  markFaceRegistered(studentId: number) { return this.http.patch(`${this.api}/${studentId}/face-registered`, {}); }
}
