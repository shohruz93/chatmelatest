import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-onboarding',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './onboarding.component.html',
    styleUrl: './onboarding.component.css'
})
export class OnboardingComponent implements OnInit {
    interests: any[] = [
        { id: 1, name: 'Music', selected: false },
        { id: 2, name: 'Movies', selected: false },
        { id: 3, name: 'Tech', selected: false },
        { id: 4, name: 'Travel', selected: false },
        { id: 5, name: 'Food', selected: false },
        { id: 6, name: 'Books', selected: false },
        { id: 7, name: 'Gaming', selected: false },
        { id: 8, name: 'Sports', selected: false },
    ];
    bio: string = '';
    userId: number = 0;

    constructor(private api: ApiService, private auth: AuthService, private router: Router) { }

    ngOnInit() {
        const user = this.auth.currentUserValue;
        if (user) {
            this.userId = user.id;
        }
    }

    toggleInterest(interest: any) {
        interest.selected = !interest.selected;
    }

    saveProfile() {
        const selectedInterests = this.interests.filter(i => i.selected).map(i => i.id);

        this.api.post(`/profile?userId=${this.userId}`, {
            bio: this.bio,
            interests: selectedInterests
        }).subscribe({
            next: () => {
                this.router.navigate(['/chat']);
            },
            error: (err) => console.error('Failed to save profile', err)
        });
    }
}
