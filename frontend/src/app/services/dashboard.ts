import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardStats {
  totalStudents: number;
  totalFaculty: number;
  todaysAttendance: number;
  attendanceRate: number;
  recentLogs: Array<{
    id: number;
    studentName: string;
    subjectName: string;
    time: string;
    status: string;
  }>;
  classes: Array<{
    id: number;
    name: string;
    department: string;
    semester: number;
    facultyName: string;
    room: string;
    time: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private api = 'http://localhost:5000/dashboard';

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.api}/stats`);
  }

  clearStudents(): Observable<any> {
    return this.http.delete<any>(`${this.api}/reset/students`);
  }

  clearFaculty(): Observable<any> {
    return this.http.delete<any>(`${this.api}/reset/faculty`);
  }

  resetDatabase(): Observable<any> {
    return this.http.delete<any>(`${this.api}/reset/all`);
  }
}
