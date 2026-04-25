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
    adLoading = false;
    cooldownRemaining = signal<string>('');
    private cooldownTimer: any;

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
        this.checkAdCooldown();
    }

    ngOnDestroy() {
        if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    }

    checkAdCooldown() {
        const lastWatch = localStorage.getItem('last_ad_watch_time');
        if (lastWatch) {
            const lastTime = parseInt(lastWatch, 10);
            const now = Date.now();
            const elapsed = now - lastTime;
            const cooldownMs = 30 * 60 * 1000; // 30 minutes

            if (elapsed < cooldownMs) {
                this.adLoading = true;
                this.updateCooldownText(cooldownMs - elapsed);
                this.cooldownTimer = setInterval(() => {
                    const newElapsed = Date.now() - lastTime;
                    if (newElapsed >= cooldownMs) {
                        clearInterval(this.cooldownTimer);
                        this.adLoading = false;
                        this.cooldownRemaining.set('');
                        localStorage.removeItem('last_ad_watch_time');
                    } else {
                        this.updateCooldownText(cooldownMs - newElapsed);
                    }
                }, 1000);
            }
        }
    }

    updateCooldownText(ms: number) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        this.cooldownRemaining.set(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
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

    watchAd() {
        if (this.adLoading) return;
        
        // Save time for UI cooldown
        localStorage.setItem('last_ad_watch_time', Date.now().toString());
        this.checkAdCooldown();

        // Get Current User ID
        const userStr = localStorage.getItem('user');
        let userId = '';
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                userId = user.id;
            } catch(e) {}
        }
        
        // Open the Direct Link in a new tab with User ID for S2S Postback
        window.open(`https://omg10.com/4/10923391?var=${userId}`, '_blank');

        alert('Watch the ad in the new tab. The system will process it and add your coins shortly!');
        
        // Check balance after 15 seconds to see if S2S arrived
        setTimeout(() => {
            this.gameService.getBalance().subscribe();
        }, 15000);
    }
}
