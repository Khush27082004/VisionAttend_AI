import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RosterEntry {
  id: number;
  enrollmentNo: string;
  fullName: string;
  email?: string;
  department: string;
  semester: number;
  division: string;
  isClaimed: boolean;
  createdAt: string;
}

export interface RosterResponse {
  roster: RosterEntry[];
  stats: {
    total: number;
    claimed: number;
    pending: number;
  };
}

export interface VerifyRosterResult {
  valid: boolean;
  claimed?: boolean;
  isRosterEmpty?: boolean;
  message: string;
  data?: {
    enrollmentNo: string;
    fullName: string;
    department: string;
    semester: number;
    division: string;
    email?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RosterService {
  private http = inject(HttpClient);
  private api = 'http://localhost:5000/roster';

  verifyEnrollment(enrollmentNo: string): Observable<VerifyRosterResult> {
    return this.http.get<VerifyRosterResult>(`${this.api}/verify/${encodeURIComponent(enrollmentNo.trim().toUpperCase())}`);
  }

  getRoster(department?: string, semester?: number, claimed?: boolean): Observable<RosterResponse> {
    const params: string[] = [];
    if (department) params.push(`department=${encodeURIComponent(department)}`);
    if (semester) params.push(`semester=${semester}`);
    if (claimed !== undefined) params.push(`claimed=${claimed}`);
    const query = params.length ? `?${params.join('&')}` : '';
    return this.http.get<RosterResponse>(`${this.api}${query}`);
  }

  addStudent(data: Partial<RosterEntry>): Observable<any> {
    return this.http.post<any>(this.api, data);
  }

  bulkAddStudents(students: Partial<RosterEntry>[]): Observable<any> {
    return this.http.post<any>(`${this.api}/bulk`, { students });
  }

  deleteStudent(id: number): Observable<any> {
    return this.http.delete<any>(`${this.api}/${id}`);
  }

  syncExistingStudents(): Observable<any> {
    return this.http.post<any>(`${this.api}/sync-existing`, {});
  }
}
