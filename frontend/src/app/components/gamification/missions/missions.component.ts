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

    showAdBanner = signal<boolean>(false);
    private adToken: string | null = null;
    adCountdown = signal<number>(30);
    private adInterval: any;

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
        if (this.adInterval) clearInterval(this.adInterval);
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
        if (this.adLoading || this.showAdBanner()) return;
        
        this.adLoading = true;
        this.gameService.startAd().subscribe({
            next: (res) => {
                if (res.adToken) {
                    this.adToken = res.adToken;
                    this.showAdBanner.set(true);
                    this.adCountdown.set(30);
                    
                    this.adInterval = setInterval(() => {
                        const current = this.adCountdown();
                        if (current > 0) {
                            this.adCountdown.set(current - 1);
                        } else {
                            clearInterval(this.adInterval);
                            this.submitAdClaim();
                        }
                    }, 1000);

                    // Inject the ad script
                    setTimeout(() => {
                        const container = document.getElementById('container-09cc432a48f328b7d41a9b783422085d');
                        if (container) {
                            const script = document.createElement('script');
                            script.async = true;
                            script.dataset['cfasync'] = 'false';
                            script.src = 'https://turbulentrefreshments.com/09cc432a48f328b7d41a9b783422085d/invoke.js';
                            container.appendChild(script);
                        }
                    }, 100);
                } else {
                    this.adLoading = false;
                    alert('Failed to start ad. Please try again.');
                }
            },
            error: (err) => {
                this.adLoading = false;
                console.error('Failed to start ad', err);
                alert('Failed to start ad. Please try again later.');
            }
        });
    }

    submitAdClaim() {
        if (!this.adToken) return;

        this.gameService.claimReward(this.adToken).subscribe({
            next: (res) => {
                this.showAdBanner.set(false);
                this.adLoading = false;
                this.adToken = null;
                alert('Success! You claimed 3 coins.');
                localStorage.setItem('last_ad_watch_time', Date.now().toString());
                this.checkAdCooldown();
            },
            error: (err) => {
                this.showAdBanner.set(false);
                this.adLoading = false;
                this.adToken = null;
                if (err.status === 429) {
                    alert('Please wait for the cooldown to finish.');
                    if (err.error?.remaining) {
                        const lastTime = Date.now() - (1800 - err.error.remaining) * 1000;
                        localStorage.setItem('last_ad_watch_time', lastTime.toString());
                        this.checkAdCooldown();
                    }
                } else {
                    console.error('Failed to claim reward', err);
                    alert(err.error?.error || 'Failed to claim reward. Please try again later.');
                }
            }
        });
    }
}
