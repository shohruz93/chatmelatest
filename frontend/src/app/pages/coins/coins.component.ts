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

    ngOnInit() {
        this.loadTransactions();
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
        if (this.isGameTx(tx)) return 'Game Reward';
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
}
