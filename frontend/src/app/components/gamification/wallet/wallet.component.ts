import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamificationService } from '../../../services/gamification.service';

@Component({
    selector: 'app-wallet',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './wallet.component.html',
    styleUrls: ['./wallet.component.css']
})
export class WalletComponent {
    gameService = inject(GamificationService);

    get level() {
        // Basic leveling: Level = sqrt(XP / 100) + 1
        // e.g. 0XP=L1, 100XP=L2, 400XP=L3, 900XP=L4
        return Math.floor(Math.sqrt(this.gameService.userXp() / 100)) + 1;
    }

    get nextLevelXp() {
        return Math.pow(this.level, 2) * 100;
    }

    get currentLevelBaseXp() {
        return Math.pow(this.level - 1, 2) * 100;
    }

    get maxLevelXp() {
        return this.nextLevelXp - this.currentLevelBaseXp;
    }

    get currentXpInLevel() {
        return this.gameService.userXp() - this.currentLevelBaseXp;
    }

    get progressPercent() {
        const current = this.currentXpInLevel;
        const target = this.maxLevelXp;
        if (target === 0) return 0;
        return Math.min(100, Math.max(0, (current / target) * 100));
    }
}
