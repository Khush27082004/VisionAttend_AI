import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AttendanceResponse { success: boolean; message?: string; attendance?: unknown; }
export interface StudentAttendance { id: number; subjectName: string; date: string; status: string; facultyName: string; }

@Injectable({ providedIn: 'root' })
export class Attendance {
  private http = inject(HttpClient);
  private api = 'http://localhost:5000/attendance';

  markPresent(studentId: number, subjectId: number, date?: string) {
    const body: any = { studentId, subjectId };
    if (date) body.date = date;
    return this.http.post<AttendanceResponse>(this.api, body);
  }

  getMyAttendance() {
    return this.http.get<StudentAttendance[]>(`${this.api}/my`);
  }

  getSubjectAttendance(subjectId: number, date?: string): Observable<any[]> {
    let url = `${this.api}/subject/${subjectId}`;
    if (date) {
      url += `?date=${encodeURIComponent(date)}`;
    }
    return this.http.get<any[]>(url);
  }

  getAllFacultyAttendance(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/faculty/all`);
  }

  clearAllAttendance(): Observable<any> {
    return this.http.delete<any>(`${this.api}/all`);
  }

  clearTodaySubjectAttendance(subjectId: number): Observable<any> {
    return this.http.delete<any>(`${this.api}/subject/${subjectId}/today`);
  }
}
