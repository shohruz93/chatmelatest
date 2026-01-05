import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamificationService, Mission } from '../../../services/gamification.service';

@Component({
    selector: 'app-missions',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './missions.component.html',
    styleUrls: ['./missions.component.css']
})
export class MissionsComponent implements OnInit {
    gameService = inject(GamificationService);
    missions = signal<Mission[]>([]);

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

    onClaim(mission: Mission) {
        if (mission.status === 'completed' && mission.user_mission_id) {
            this.gameService.claimMission(mission.user_mission_id).subscribe(() => {
                // Update local state
                this.missions.update(current =>
                    current.map(m => m.id === mission.id ? { ...m, status: 'claimed' as const } : m)
                );
            });
        }
    }
}
