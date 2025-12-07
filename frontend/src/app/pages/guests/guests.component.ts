import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-guests',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './guests.component.html',
    styleUrls: ['./guests.component.css']
})
export class GuestsComponent implements OnInit {
    guests: any[] = [];
    loading = true;
    currentUser: any;

    constructor(
        private apiService: ApiService,
        private authService: AuthService
    ) { }

    ngOnInit() {
        this.currentUser = this.authService.currentUserValue;
        if (this.currentUser) {
            this.loadGuests();
        }
    }

    loadGuests() {
        this.loading = true;
        this.apiService.getGuests(this.currentUser.id).subscribe({
            next: (data) => {
                this.guests = data.map((guest: any) => {
                    if (guest.avatar && !guest.avatar.startsWith('http')) {
                        guest.avatar = `${this.apiService.phpBaseUrl}${guest.avatar}`;
                    }
                    return guest;
                });
                this.loading = false;
                // Mark guests as seen after loading
                this.apiService.markGuestsAsSeen(this.currentUser.id).subscribe();
            },
            error: (error) => {
                console.error('Error loading guests:', error);
                this.loading = false;
            }
        });
    }
}
