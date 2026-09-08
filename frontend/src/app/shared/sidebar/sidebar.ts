import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

interface NavItem {
  icon: string;
  label: string;
  route?: string;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar implements OnInit {

  primaryItems: NavItem[] = [];

  systemItems: NavItem[] = [
    { icon: 'fa-gear', label: 'Settings', route: '/dashboard/settings' }
  ];

  userName    = '';
  userRole    = '';
  userInitials = '';

  ngOnInit() {
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.userName     = user.fullName ?? user.email ?? 'User';
      this.userRole     = user.role ?? '';
      this.userInitials = this.userName
        .split(' ')
        .slice(0, 2)
        .map((n: string) => n[0])
        .join('');
      
      this.setupMenu();
    } catch { /* ignore */ }
  }

  setupMenu() {
    if (this.userRole === 'ADMIN') {
      this.primaryItems = [
        { icon: 'fa-house',           label: 'Dashboard',  route: '/dashboard',          exact: true },
        { icon: 'fa-user-graduate',   label: 'Students',   route: '/dashboard/students', exact: false },
        { icon: 'fa-id-card',         label: 'Master Roster', route: '/dashboard/admin/roster', exact: false },
        { icon: 'fa-chalkboard-user', label: 'Faculty List', route: '/dashboard/admin/faculty',  exact: false },
        { icon: 'fa-user-tie',        label: 'Faculty Reports', route: '/dashboard/admin/faculty-reports', exact: false },
        { icon: 'fa-chart-pie',       label: 'Student Reports', route: '/dashboard/reports', exact: false }
      ];
    } else if (this.userRole === 'FACULTY') {
      this.primaryItems = [
        { icon: 'fa-house',           label: 'Faculty Panel', route: '/dashboard/faculty',  exact: true },
        { icon: 'fa-clipboard-list',  label: 'Attendance Records', route: '/dashboard/faculty/records', exact: false },
        { icon: 'fa-chart-pie',       label: 'Attendance Reports', route: '/dashboard/faculty/reports', exact: false },
        { icon: 'fa-book-open',       label: 'Add Subject', route: '/dashboard/faculty/subjects', exact: false }
      ];
    } else if (this.userRole === 'STUDENT') {
      this.primaryItems = [
        { icon: 'fa-house',           label: 'Student Panel', route: '/dashboard/student',  exact: true },
        { icon: 'fa-calendar-days',   label: 'My Attendance', route: '/dashboard/student/attendance', exact: false }
      ];
    }
  }

}
