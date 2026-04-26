import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GamificationService } from '../../services/gamification.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { WalletComponent } from '../../components/gamification/wallet/wallet.component';
import { ApiService } from '../../services/api.service';

interface Transaction {
    id: number;
    sender_id: number;
    receiver_id: number;
    amount: number;
    type: string;
    note: string | null;
    created_at: string;
    sender_name: string;
    sender_avatar: string;
    receiver_name: string;
    receiver_avatar: string;
    direction: 'incoming' | 'outgoing';
}

@Component({
    selector: 'app-coins',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe, WalletComponent],
    templateUrl: './coins.component.html',
    styleUrls: ['./coins.component.css']
})
export class CoinsComponent implements OnInit {
    gamificationService = inject(GamificationService);
    private api = inject(ApiService);

    transactions = signal<Transaction[]>([]);
    loading = signal(true);
    activeTab: 'all' | 'incoming' | 'outgoing' = 'all';
    adLoading = false;
    showAdBanner = signal(false);
    adCountdown = signal(30);
    private adToken: string | null = null;
    private adInterval: any;

    ngOnInit() {
        this.loadTransactions();
    }

    ngOnDestroy() {
        if (this.adInterval) clearInterval(this.adInterval);
    }

    loadTransactions() {
        this.loading.set(true);
        this.gamificationService.getTransactions(this.activeTab).subscribe({
            next: (data) => {
                this.transactions.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to load transactions:', err);
                this.loading.set(false);
            }
        });
    }

    setTab(tab: 'all' | 'incoming' | 'outgoing') {
        this.activeTab = tab;
        this.loadTransactions();
    }

    getAvatar(tx: Transaction): string {
        if (tx.direction === 'incoming') {
            return tx.sender_avatar ? `${this.api.phpBaseUrl}${tx.sender_avatar}` : 'assets/default-avatar.png';
        } else {
            return tx.receiver_avatar ? `${this.api.phpBaseUrl}${tx.receiver_avatar}` : 'assets/default-avatar.png';
        }
    }

    getName(tx: Transaction): string {
        if (tx.type === 'win' && tx.note === 'Won in ad_reward') return 'Ad Reward';
        if (this.isGameTx(tx)) return 'Game Reward';
        if (this.isMissionTx(tx)) return 'Daily Mission';
        const name = tx.direction === 'incoming' ? tx.sender_name : tx.receiver_name;
        return name || 'Unknown User';
    }

    formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    isGameTx(tx: Transaction): boolean {
        return ['bet', 'win'].includes(tx.type);
    }

    isMissionTx(tx: Transaction): boolean {
        return tx.note === 'Reward for mission: ';
    }

    watchAd() {
        if (this.adLoading || this.showAdBanner()) return;

        this.adLoading = true;
        this.gamificationService.startAd().subscribe({
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

        this.gamificationService.claimReward(this.adToken).subscribe({
            next: (res) => {
                this.showAdBanner.set(false);
                this.adLoading = false;
                this.adToken = null;
                alert('Success! You earned 1 coin! 🪙');
                this.loadTransactions();
            },
            error: (err) => {
                this.showAdBanner.set(false);
                this.adLoading = false;
                this.adToken = null;
                console.error('Failed to claim reward', err);
                alert(err.error?.error || 'Failed to claim reward. Please try again later.');
            }
        });
    }
}
