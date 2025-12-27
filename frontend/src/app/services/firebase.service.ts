import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    Auth,
    User,
    onAuthStateChanged,
    getAdditionalUserInfo
} from 'firebase/auth';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

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

        // Initialize Google Auth for native platforms
        if (Capacitor.isNativePlatform()) {
            this.initializeNativeGoogleAuth();
        }
    }

    private async initializeNativeGoogleAuth() {
        try {
            await GoogleAuth.initialize({
                clientId: '1021066705022-ic2rk68rst25k5u80s1se4qkjoicligd.apps.googleusercontent.com',
                scopes: ['profile', 'email'],
                grantOfflineAccess: true,
            });
        } catch (error) {
            console.error('Error initializing Google Auth:', error);
        }
    }

    // Sign in with Google
    async signInWithGoogle(): Promise<{ idToken: string | null, profile?: any }> {
        try {
            if (Capacitor.isNativePlatform()) {
                // Ensure initialization before sign-in
                await this.initializeNativeGoogleAuth();
                const result = await GoogleAuth.signIn();
                return {
                    idToken: result.authentication.idToken,
                    profile: {
                        given_name: (result as any).givenName,
                        family_name: (result as any).familyName,
                        name: (result as any).displayName,
                        picture: (result as any).imageUrl
                    }
                };
            }

            const result = await signInWithPopup(this.auth, this.googleProvider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const additionalInfo = getAdditionalUserInfo(result);

            return {
                idToken: credential?.idToken || null,
                profile: {
                    name: (result.user as any).displayName,
                    picture: (result.user as any).photoURL,
                    email: result.user.email,
                    given_name: (additionalInfo?.profile as any)?.given_name,
                    family_name: (additionalInfo?.profile as any)?.family_name
                }
            };
        } catch (error: any) {
            console.error('Error signing in with Google:', error);
            // Alert for mobile debugging
            if (Capacitor.isNativePlatform()) {
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
