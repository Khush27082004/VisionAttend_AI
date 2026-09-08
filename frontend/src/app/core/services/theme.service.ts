import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDark = false;

  constructor() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      this.setDark(true);
    } else {
      this.setDark(false);
    }
  }

  isDarkMode(): boolean {
    return this.isDark;
  }

  toggleTheme(): boolean {
    this.setDark(!this.isDark);
    return this.isDark;
  }

  setDark(dark: boolean) {
    this.isDark = dark;
    if (dark) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }
}
