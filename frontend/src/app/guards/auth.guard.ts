import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.currentUserValue) {
        return true;
    }

    router.navigate(['/login']);
    return false;
};

export const loginGuard: CanActivateFn = (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    // If user is already logged in, redirect to chat
    if (auth.currentUserValue) {
        router.navigate(['/dashboard/explore']);
        return false;
    }

    return true;
};
