import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-follows',
    standalone: true,
    imports: [CommonModule, RouterLink, TranslatePipe, FormsModule],
    templateUrl: './follows.component.html',
    styleUrls: ['./follows.component.css']
})
export class FollowsComponent implements OnInit {
    users: any[] = [];
    filteredUsers: any[] = [];
    searchTerm: string = '';
    loading = true;
    type: 'followers' | 'following' = 'followers';
    userId: number = 0;

    constructor(
        private route: ActivatedRoute,
        private apiService: ApiService
    ) { }

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.userId = +params['id'];
            this.route.url.subscribe(urlSegments => {
                const path = urlSegments[urlSegments.length - 1].path;
                this.type = path as 'followers' | 'following';
                this.loadUsers();
            });
        });
    }

    loadUsers() {
        this.loading = true;
        const request = this.type === 'followers' 
            ? this.apiService.getFollowers(this.userId)
            : this.apiService.getFollowing(this.userId);

        request.subscribe({
            next: (data) => {
                this.users = data.map((user: any) => {
                    if (user.avatar && !user.avatar.startsWith('http')) {
                        user.avatar = `${this.apiService.phpBaseUrl}${user.avatar}`;
                    }
                    return user;
                });
                this.filteredUsers = this.users;
                this.searchTerm = '';
                this.loading = false;
            },
            error: (error) => {
                console.error(`Error loading ${this.type}:`, error);
                this.loading = false;
            }
        });
    }

    filterUsers() {
        const term = this.searchTerm.trim().toLowerCase();
        if (!term) {
            this.filteredUsers = this.users;
        } else {
            this.filteredUsers = this.users.filter(u => 
                (u.name && u.name.toLowerCase().includes(term)) ||
                (u.bio && u.bio.toLowerCase().includes(term)) ||
                (u.location && u.location.toLowerCase().includes(term))
            );
        }
    }

    getPlaceholder(gender: string): string {
        return gender === 'female' ? 'assets/images/female-avatar.png' : 'assets/images/male-avatar.png';
    }
}
