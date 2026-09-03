import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Faculty {
  private http = inject(HttpClient);
  private api = 'http://localhost:5000/faculty';

  getFaculty(): Observable<any[]> {
    return this.http.get<any[]>(this.api);
  }

  createFaculty(data: any): Observable<any> {
    return this.http.post(this.api, data);
  }
}
