import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GamificationService } from '../../services/gamification.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-leaderboard',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe],
    templateUrl: './leaderboard.component.html',
    styleUrls: ['./leaderboard.component.css']
})
export class LeaderboardComponent implements OnInit {
    private gamificationService = inject(GamificationService);
    public languageService = inject(LanguageService);

    topUsers = signal<any[]>([]);
    currentUser = signal<any>(null);
    apiUrl = environment.phpBaseUrl;

    ngOnInit() {
        this.loadLeaderboard();
    }

    loadLeaderboard() {
        this.gamificationService.getLeaderboard().subscribe({
            next: (data) => {
                this.topUsers.set(data.top_users || []);
                this.currentUser.set(data.current_user || null);
            },
            error: (err) => console.error('Failed to load leaderboard', err)
        });
    }

    getAvatarUrl(avatar: string | null): string {
        if (!avatar) {
            return 'default-avatar.png';
        }
        if (avatar.startsWith('http')) {
            return avatar;
        }
        if (avatar.startsWith('/')) {
            return `${this.apiUrl}${avatar}`;
        }
        if (avatar.startsWith('uploads/')) {
            return `${this.apiUrl}/${avatar}`;
        }
        return `${this.apiUrl}/uploads/avatars/${avatar}`;
    }
}
