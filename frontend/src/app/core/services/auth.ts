import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);
  private api = 'http://localhost:5000/auth';

  login(data: any) {
    return this.http.post(`${this.api}/login`, data);
  }
  register(data: any) {
    return this.http.post(`${this.api}/register`, data);
  }
  getProfile() {
    return this.http.get(`${this.api}/profile`);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');

    }

}
