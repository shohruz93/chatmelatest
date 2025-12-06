import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class AdminGuard implements CanActivate {

    constructor(private authService: AuthService, private router: Router) { }

    canActivate(): Observable<boolean> {
        return this.authService.user$.pipe(
            map(user => {
                // If user is logged in and is_admin is 1 (or true), allow access
                if (user && (user.is_admin === 1 || user.is_admin === true)) {
                    return true;
                }

                // Otherwise redirect to 404
                this.router.navigate(['/404']);
                return false;
            })
        );
    }
}
