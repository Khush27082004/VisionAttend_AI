import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AttendanceResponse { success: boolean; message?: string; attendance?: unknown; }
export interface StudentAttendance { id: number; subjectName: string; date: string; status: string; facultyName: string; }

@Injectable({ providedIn: 'root' })
export class Attendance {
  private http = inject(HttpClient);
  private api = 'http://localhost:5000/attendance';

  markPresent(studentId: number, subjectId: number, date?: string, isProxy?: boolean, proxyNotes?: string) {
    const body: any = { studentId, subjectId };
    if (date) body.date = date;
    if (isProxy) {
      body.isProxy = true;
      if (proxyNotes) body.proxyNotes = proxyNotes;
    }
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

  getAllFacultyAttendance(view?: string): Observable<any[]> {
    const query = view ? `?view=${encodeURIComponent(view)}` : '';
    return this.http.get<any[]>(`${this.api}/faculty/all${query}`);
  }

  clearAllAttendance(): Observable<any> {
    return this.http.delete<any>(`${this.api}/all`);
  }

  clearTodaySubjectAttendance(subjectId: number): Observable<any> {
    return this.http.delete<any>(`${this.api}/subject/${subjectId}/today`);
  }

  getClasswiseReport(params: {
    subjectId?: number | null;
    department?: string;
    semester?: number | null;
    division?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<{ summary: any; students: any[] }> {
    const queryParts: string[] = [];
    if (params.subjectId) queryParts.push(`subjectId=${encodeURIComponent(params.subjectId)}`);
    if (params.department) queryParts.push(`department=${encodeURIComponent(params.department)}`);
    if (params.semester) queryParts.push(`semester=${encodeURIComponent(params.semester)}`);
    if (params.division && params.division !== 'ALL') queryParts.push(`division=${encodeURIComponent(params.division)}`);
    if (params.startDate) queryParts.push(`startDate=${encodeURIComponent(params.startDate)}`);
    if (params.endDate) queryParts.push(`endDate=${encodeURIComponent(params.endDate)}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return this.http.get<{ summary: any; students: any[] }>(`${this.api}/report/classwise${queryString}`);
  }
}
