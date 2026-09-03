import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const router = inject(Router);
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      if (user && allowedRoles.includes(user.role)) {
        return true;
      }
    } catch (e) {
      console.error('Role guard error:', e);
    }
    
    // Redirect based on role if unauthorized
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      if (user.role === 'STUDENT') {
        router.navigate(['/dashboard/student']);
      } else if (user.role === 'FACULTY') {
        router.navigate(['/dashboard/faculty']);
      } else {
        router.navigate(['/']);
      }
    } catch {
      router.navigate(['/']);
    }
    return false;
  };
};
