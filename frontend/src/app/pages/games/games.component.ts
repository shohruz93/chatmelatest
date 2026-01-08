import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  template: `
    <div class="games-container">
      <div class="games-header">
        <h1>🎮 {{ 'GAMES.TITLE' | translate }}</h1>
        <p>{{ 'GAMES.SUBTITLE' | translate }}</p>
      </div>

      <div class="games-grid">
        @if (invitation()) {
          <div class="invitation-overlay">
            <div class="invitation-card">
              <h3>Checkers Invite!</h3>
              <p>User #{{ invitation().fromUserId }} {{ 'GAMES.INVITE_RECEIVED' | translate }} {{ invitation().amount }} 🪙</p>
              <div class="actions">
                <button class="accept-btn" (click)="acceptInvite()">{{ 'CHECKERS.ACCEPT' | translate }}</button>
                <button class="reject-btn" (click)="rejectInvite()">{{ 'CHECKERS.REJECT' | translate }}</button>
              </div>
            </div>
          </div>
        }

        <div class="game-card checkers">
          <div class="game-icon">🏁</div>
          <div class="game-info">
            <h3>{{ 'GAMES.CHECKERS' | translate }}</h3>
            <p>{{ 'GAMES.CHECKERS_DESC' | translate }}</p>
            <button class="play-btn" routerLink="checkers">{{ 'GAMES.PLAY_NOW' | translate }}</button>
          </div>
        </div>
        
        <!-- Future games can be added here -->
      </div>
    </div>
  `,
  styles: [`
    .games-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .games-header {
      margin-bottom: 30px;
      text-align: center;
    }
    .games-header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      color: #fff;
    }
    .games-header p {
      color: #aaa;
      font-size: 1.1rem;
    }
    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .game-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 15px;
      overflow: hidden;
      transition: transform 0.3s ease, background 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 30px;
      text-align: center;
    }
    .game-card:hover {
      transform: translateY(-5px);
      background: rgba(255, 255, 255, 0.08);
      border-color: #6366f1;
    }
    .game-icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }
    .game-info h3 {
      font-size: 1.5rem;
      margin-bottom: 10px;
      color: #fff;
    }
    .game-info p {
      color: #888;
      margin-bottom: 20px;
      font-size: 0.95rem;
    }
    .play-btn {
      background: #6366f1;
      color: white;
      border: none;
      padding: 10px 25px;
      border-radius: 25px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s ease;
    }
    .play-btn:hover {
      background: #4f46e5;
    }
    .invitation-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .invitation-card {
      background: #2a2a2a;
      padding: 30px;
      border-radius: 15px;
      border: 2px solid #6366f1;
      text-align: center;
    }
    .actions { margin-top: 20px; display: flex; gap: 10px; justify-content: center; }
    .accept-btn { background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
    .reject-btn { background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
  `]
})
export class GamesComponent implements OnInit {
  private socket = inject(SocketService);
  private router = inject(Router);

  invitation = signal<any>(null);

  ngOnInit() {
    this.socket.checkersInvite$.subscribe(invite => {
      this.invitation.set(invite);
    });
  }

  acceptInvite() {
    const invite = this.invitation();
    if (invite) {
      this.router.navigate(['/dashboard/games/checkers']);
    }
  }

  rejectInvite() {
    this.invitation.set(null);
  }
}
