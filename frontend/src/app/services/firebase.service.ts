import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    Auth,
    User,
    onAuthStateChanged
} from 'firebase/auth';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class FirebaseService {
    private auth: Auth;
    private googleProvider: GoogleAuthProvider;

    constructor() {
        // Initialize Firebase
        const app = initializeApp(environment.firebase);
        this.auth = getAuth(app);
        this.googleProvider = new GoogleAuthProvider();

        // Configure Google provider
        this.googleProvider.setCustomParameters({
            prompt: 'select_account'
        });
    }

    // Sign in with Google popup
    async signInWithGoogle(): Promise<string | null> {
        try {
            const result = await signInWithPopup(this.auth, this.googleProvider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            return credential?.idToken || null;
        } catch (error: any) {
            console.error('Error signing in with Google:', error);
            // Alert for mobile debugging
            if (window.hasOwnProperty('Capacitor')) {
                alert('Sign-In Error: ' + (error.message || JSON.stringify(error)));
            }
            throw error;
        }
    }

    // Sign out
    async signOut(): Promise<void> {
        try {
            await this.auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }

    // Get current user
    getCurrentUser(): User | null {
        return this.auth.currentUser;
    }

    // Observe auth state changes
    getAuthState(): Observable<User | null> {
        return new Observable(observer => {
            const unsubscribe = onAuthStateChanged(this.auth,
                user => observer.next(user),
                error => observer.error(error)
            );
            return { unsubscribe };
        });
    }

    // Get ID token for API calls
    async getIdToken(): Promise<string | null> {
        const user = this.auth.currentUser;
        if (user) {
            return await user.getIdToken();
        }
        return null;
    }
}
