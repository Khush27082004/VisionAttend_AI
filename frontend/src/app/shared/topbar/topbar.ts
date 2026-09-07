import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard':                    'Dashboard',
  '/dashboard/students':           'Students',
  '/dashboard/students/add':       'Add Student',
  '/dashboard/faculty':            'Faculty Dashboard',
  '/dashboard/faculty/records':    'Attendance Records',
  '/dashboard/faculty/subjects':   'My Subjects',
  '/dashboard/admin/roster':       'Master Student Roster',
  '/dashboard/student':            'Student Dashboard',
  '/dashboard/student/attendance': 'My Attendance',
};

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss'
})
export class Topbar implements OnInit {

  @Output() logoutEvent = new EventEmitter<void>();
  @Output() toggleSidebarEvent = new EventEmitter<void>();

  private router = inject(Router);

  pageTitle    = 'Dashboard';
  userName     = '';
  userRole     = '';
  userInitials = '';
  today        = '';

  ngOnInit() {
    // Resolve user info from localStorage
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.userName     = user.fullName ?? user.email ?? 'User';
      this.userRole     = user.role ?? '';
      this.userInitials = this.userName
        .split(' ')
        .slice(0, 2)
        .map((n: string) => n[0])
        .join('');
    } catch { /* ignore */ }

    // Set today's date label
    this.today = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Dynamic page title from router
    this.updateTitle(this.router.url);
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => this.updateTitle(e.urlAfterRedirects ?? e.url));
  }

  logout() {
    this.logoutEvent.emit();
  }

  toggleSidebar() {
    this.toggleSidebarEvent.emit();
  }

  private updateTitle(url: string) {
    // Exact match first; then strip trailing query/hash
    const clean = url.split('?')[0].split('#')[0];
    // Try to match dynamic segments like /students/:id/register-face
    if (clean.includes('register-face')) { this.pageTitle = 'Register Face'; return; }
    if (clean.includes('/students/edit')) { this.pageTitle = 'Edit Student'; return; }
    this.pageTitle = ROUTE_TITLES[clean] ?? 'FacultyEase Ai';
  }
}
