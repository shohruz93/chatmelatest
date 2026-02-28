import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { GamificationService, Mission } from '../../../services/gamification.service';

@Component({
    selector: 'app-missions',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './missions.component.html',
    styleUrls: ['./missions.component.css']
})
export class MissionsComponent implements OnInit {
    gameService = inject(GamificationService);
    missions = signal<Mission[]>([]);

    // Icon mapping for different mission types
    private iconMap: { [key: string]: string } = {
        'translate_message': '🌐',
        'send_message': '💬',
        'daily_login': '📅',
        'login': '🔐',
        'make_friend': '🤝',
        'add_friend': '👥',
        'play_game': '🎮',
        'win_game': '🏆',
        'profile_complete': '✨',
        'complete_profile': '📝',
        'send_image': '📷',
        'send_voice': '🎤',
        'send_sticker': '😊',
        'rate_user': '⭐',
        'comment': '💭',
        'explore_users': '🔍',
        'change_avatar': '🖼️',
        'first_chat': '👋',
        'invite_friend': '📨',
        'share_app': '📲',
        'default': '🎯'
    };

    ngOnInit() {
        this.loadMissions();
    }

    loadMissions() {
        this.gameService.getMissions().subscribe({
            next: (data) => {
                this.missions.set(data);
            },
            error: (err) => {
                console.error('Failed to load missions', err);
            }
        });
    }

    getProgressPercent(mission: Mission): number {
        const p = mission.progress || 0;
        const t = mission.condition_value || 1;
        return Math.min(100, (p / t) * 100);
    }

    getMissionIcon(mission: Mission): string {
        // First check if mission has a custom icon
        if (mission.icon && mission.icon.length <= 2) {
            return mission.icon; // Already an emoji
        }
        // Use condition_key to determine icon
        const key = mission.condition_key?.toLowerCase() || '';
        return this.iconMap[key] || this.iconMap['default'];
    }

}
