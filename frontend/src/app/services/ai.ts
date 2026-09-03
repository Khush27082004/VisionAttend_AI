import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FaceRegistrationResponse { success: boolean; message: string; }
export interface RecognitionResponse { recognized: boolean; studentId?: string; studentIds?: string[]; distance?: number; message?: string; }

@Injectable({ providedIn: 'root' })
export class AiService {
  private api = 'http://127.0.0.1:8000';
  constructor(private http: HttpClient) {}

  registerFace(studentId: number, image: File): Observable<FaceRegistrationResponse> {
    const formData = new FormData();
    formData.append('studentId', String(studentId));
    formData.append('image', image);
    
    return this.http.post<FaceRegistrationResponse>(`${this.api}/register-face`, formData);
  }

  recognize(image: File): Observable<RecognitionResponse> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http.post<RecognitionResponse>(`${this.api}/recognize`, formData);
  }
}
