import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {

  console.log('Auth Guard Executed');

  const router = inject(Router);

  const token = localStorage.getItem('token');

  console.log('Token:', token);

  if (token) {
    return true;
  }

  router.navigate(['/']);

  return false;
};