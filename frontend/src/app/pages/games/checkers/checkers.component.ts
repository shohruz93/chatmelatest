import { Component, OnInit, OnDestroy, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../../services/socket.service';
import { AuthService } from '../../../services/auth.service';
import { GamificationService } from '../../../services/gamification.service';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { VoiceChatService } from '../../../services/voice-chat.service';
import * as Phaser from 'phaser';

@Component({
  selector: 'app-checkers',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="checkers-wrapper">
      <!-- Matchmaking / Lobby UI -->
      @if (!gameStarted()) {
        <div class="lobby-container">
          <h2>{{ 'CHECKERS.LOBBY' | translate }}</h2>
          <div class="coin-balance">{{ 'CHECKERS.BALANCE' | translate }}: {{ coins() }} 🪙</div>
          
          <div class="bet-input">
            <label>{{ 'CHECKERS.BET_AMOUNT' | translate }}:</label>
            <input type="number" [(ngModel)]="betAmount" min="10" max="1000" step="10">
          </div>

          @if (invitation()) {
            <div class="invitation-card">
              <p>{{ 'PROFILE.USER_PREFIX' | translate }}{{ invitation().fromUserId }} {{ 'CHECKERS.INVITED_YOU' | translate }} {{ invitation().amount }} 🪙</p>
              <div class="actions">
                <button class="accept-btn" (click)="acceptInvite()">{{ 'CHECKERS.ACCEPT' | translate }}</button>
                <button class="reject-btn" (click)="rejectInvite()">{{ 'CHECKERS.REJECT' | translate }}</button>
              </div>
            </div>
          } @else {
            <div class="online-users">
                <h3>{{ 'CHECKERS.ONLINE_PLAYERS' | translate }}</h3>
                @for (userId of onlinePlayers(); track userId) {
                    @if (userId !== currentUserId) {
                        <div class="user-row">
                            <span>{{ 'PROFILE.PLAYER_PREFIX' | translate }}{{ userId }}</span>
                            @if (waitingForInviteTo() === userId) {
                                <div class="waiting-accept">
                                    <span>{{ 'CHECKERS.WAITING_ACCEPT' | translate }}</span>
                                    <div class="dots"><span>.</span><span>.</span><span>.</span></div>
                                </div>
                            } @else {
                                <button class="invite-btn" (click)="sendInvite(userId)">{{ 'CHECKERS.INVITE' | translate }}</button>
                            }
                        </div>
                    }
                } @empty {
                    <p>{{ 'CHECKERS.NO_PLAYERS' | translate }}</p>
                }
            </div>
          }
        </div>
      }

      <!-- Game UI -->
      <div class="game-area" [class.hidden]="!gameStarted()">
        <!-- Mobile Player Info - Top -->
        <div class="mobile-player-info">
          <div class="player-badge" [class.active]="currentTurn() === redPlayerId()" [class.red-player]="true">
            <span class="player-color red"></span>
            <span class="player-name">{{ isRedPlayer() ? ('CHECKERS.YOU' | translate) : partnerNameTranslated }}</span>
          </div>
          <div class="vs-badge">VS</div>
          <div class="player-badge" [class.active]="currentTurn() === blackPlayerId()" [class.black-player]="true">
            <span class="player-color black"></span>
            <span class="player-name">{{ !isRedPlayer() ? ('CHECKERS.YOU' | translate) : partnerNameTranslated }}</span>
          </div>
        </div>

        <div class="canvas-wrapper">
          <div id="checkers-container" #gameContainer></div>
        </div>
        
        <div class="game-sidebar">
          <div class="game-info desktop-only">
            <div class="player-info">
              <div class="p-red" [class.active]="currentTurn() === redPlayerId()">
                <span class="player-color-dot red"></span>
                {{ isRedPlayer() ? ('CHECKERS.YOU' | translate) : partnerNameTranslated }}
              </div>
              <div class="p-black" [class.active]="currentTurn() === blackPlayerId()">
                <span class="player-color-dot black"></span>
                {{ !isRedPlayer() ? ('CHECKERS.YOU' | translate) : partnerNameTranslated }}
              </div>
            </div>
            <div class="turn-indicator" [class.my-turn]="isMyTurn()">
              {{ isMyTurn() ? ('CHECKERS.YOUR_TURN' | translate) : ('CHECKERS.WAITING' | translate) }}
            </div>
            
            <!-- Voice Chat Controls -->
            <button class="voice-btn" [class.active]="voiceChat.isActive()" [class.muted]="voiceChat.isMuted()" [class.connecting]="voiceChat.isConnecting()" (click)="toggleMic()" [disabled]="voiceChat.isConnecting()">
               <i class="voice-icon">{{ voiceChat.isMuted() ? '🔇' : (voiceChat.isActive() ? '🎙️' : '📞') }}</i>
               {{ voiceChat.isConnecting() ? ('VOICE.CONNECTING' | translate) : (voiceChat.isActive() ? (voiceChat.isMuted() ? ('VOICE.UNMUTE' | translate) : ('VOICE.MUTE' | translate)) : ('VOICE.START_CALL' | translate)) }}
            </button>
            
            @if (voiceChat.connectionError()) {
              <div class="voice-error">
                {{ voiceChat.connectionError() }}
                <button class="retry-btn" (click)="retryVoiceConnection()">{{ 'COMMON.RETRY' | translate }}</button>
              </div>
            }
          </div>

          <div class="game-chat">
            <div class="chat-messages" #chatScroll>
              @for (msg of chatMessages(); track $index) {
                <div class="chat-msg" [class.own]="msg.senderId === currentUserId">
                  <span class="sender">#{{ msg.senderId }}:</span>
                  <span class="text">{{ msg.translatedText || msg.message }}</span>
                  @if (!msg.translatedText && msg.senderId !== currentUserId) {
                    <button class="translate-btn" (click)="translateMessage(msg)">
                      <i class="translate-icon">🌐</i>
                    </button>
                  }
                </div>
              }
            </div>
            <div class="chat-input">
              <input type="text" [(ngModel)]="newMessage" (keyup.enter)="sendChat()" placeholder="{{ 'CHECKERS.TYPE_MESSAGE' | translate }}">
              <button (click)="sendChat()">{{ 'CHECKERS.SEND' | translate }}</button>
            </div>
          </div>

          <button class="leave-btn" (click)="leaveGame()">{{ 'CHECKERS.LEAVE' | translate }}</button>
        </div>
      </div>

      <!-- Game Result Modal -->
      @if (showGameResult()) {
        <div class="result-modal-overlay">
          <div class="result-modal">
            <div class="result-icon" [class.win]="gameResultWin()" [class.lose]="!gameResultWin()">
              {{ gameResultWin() ? '🏆' : '😔' }}
            </div>
            <h2 class="result-title" [class.win]="gameResultWin()" [class.lose]="!gameResultWin()">
              {{ gameResultWin() ? ('CHECKERS.VICTORY' | translate) : ('CHECKERS.LOSE' | translate) }}
            </h2>
            @if (gameResultWin()) {
              <div class="result-coins">+{{ betAmount * 2 }} 🪙</div>
            }
            <button class="result-btn" (click)="closeResultAndNavigate()">{{ 'COMMON.CLOSE' | translate }}</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .checkers-wrapper {
      width: 100%;
      min-height: calc(100vh - 70px);
      display: flex;
      justify-content: center;
      align-items: flex-start; /* Changed from center to allow scrolling if needed */
      background: #1a1a1a;
      color: white;
      padding: 20px;
      overflow-y: auto; /* Enable vertical scroll if content overflows */
    }
    .lobby-container {
      background: #2a2a2a;
      padding: 30px;
      border-radius: 15px;
      width: 100%;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      margin-top: 20px;
    }
    .coin-balance { font-size: 1.2rem; margin: 15px 0; color: #fbbf24; }
    .bet-input { margin-bottom: 20px; display: flex; justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap;}
    .bet-input input { padding: 8px; border-radius: 5px; border: none; width: 100px; background: #333; color: white; }
    
    .online-users { text-align: left; background: #1a1a1a; padding: 15px; border-radius: 10px; margin-top: 20px; max-height: 300px; overflow-y: auto; }
    .user-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #333; flex-wrap: wrap; gap: 10px;}
    .invite-btn, .accept-btn { background: #6366f1; color: white; border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer; white-space: nowrap; }
    .reject-btn { background: #ef4444; color: white; border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer; margin-left: 10px; white-space: nowrap; }
    .invitation-card { background: #374151; padding: 20px; border-radius: 10px; margin-top: 20px; border: 2px solid #6366f1; }

    .game-area { display: flex; gap: 20px; max-width: 1200px; width: 100%; justify-content: center; }
    .canvas-wrapper {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        min-width: 0;
        flex: 1 1 auto;
    }
    .hidden { display: none; }
    #checkers-container { 
        background: #000; 
        border-radius: 10px; 
        overflow: hidden; 
        border: 4px solid #333;
        width: 100%;
        max-width: 600px; /* Max size for desktop */
        aspect-ratio: 1 / 1;
        position: relative;
    }
    /* Ensure canvas fits inside container */
    ::ng-deep #checkers-container canvas {
        width: 100% !important;
        height: 100% !important;
        display: block;
    }
    
    .game-sidebar { 
        width: 300px; 
        display: flex; 
        flex-direction: column; 
        gap: 20px; 
        flex-shrink: 0;
    }
    
    .game-info { background: #2a2a2a; padding: 15px; border-radius: 10px; }
    .player-info { display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; }
    .p-red, .p-black { padding: 8px; border-radius: 5px; background: #333; font-size: 0.9rem; }
    .active { border: 2px solid #6366f1; background: #374151; }
    .turn-indicator { text-align: center; font-weight: bold; padding: 10px; border-radius: 5px; background: #333; margin-bottom: 10px; }
    .my-turn { background: #059669; color: white; animation: pulse 1.5s infinite; }

    .voice-btn {
        width: 100%;
        padding: 10px;
        border-radius: 8px;
        border: none;
        background: #374151;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 600;
        transition: all 0.2s;
    }
    .voice-btn:hover { background: #4b5563; }
    .voice-btn.active { background: #059669; }
    .voice-btn.muted { background: #ef4444; }
    .voice-btn.connecting { background: #f59e0b; cursor: wait; }
    .voice-btn:disabled { opacity: 0.7; cursor: not-allowed; }

    .voice-error {
        background: #fee2e2;
        color: #991b1b;
        padding: 8px 12px;
        border-radius: 8px;
        margin-top: 8px;
        font-size: 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .retry-btn {
        background: #ef4444;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: background 0.2s;
    }

    .retry-btn:hover {
        background: #dc2626;
    }

    .game-chat { flex-grow: 1; background: #2a2a2a; border-radius: 10px; display: flex; flex-direction: column; height: 400px; min-height: 300px; }
    .chat-messages { flex-grow: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
    .chat-msg { background: #374151; padding: 8px 30px 8px 8px; border-radius: 8px; max-width: 90%; align-self: flex-start; position: relative; word-break: break-word; font-size: 0.9rem; }
    .chat-msg.own { background: #6366f1; align-self: flex-end; padding-right: 8px; }
    .sender { font-size: 0.75rem; display: block; opacity: 0.7; margin-bottom: 2px; }
    .translate-btn {
        position: absolute;
        right: 5px;
        top: 5px;
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 0.8rem;
        padding: 2px;
        border-radius: 4px;
        transition: all 0.2s;
    }
    .translate-btn:hover { color: white; background: rgba(255,255,255,0.1); }
    .chat-input { display: flex; padding: 10px; gap: 5px; }
    .chat-input input { flex-grow: 1; background: #333; border: none; color: white; padding: 8px; border-radius: 5px; min-width: 0; }
    .chat-input button { background: #6366f1; border: none; color: white; padding: 0 15px; border-radius: 5px; cursor: pointer; white-space: nowrap; }

    .leave-btn { background: #ef4444; color: white; border: none; padding: 10px; border-radius: 5px; font-weight: bold; cursor: pointer; width: 100%; margin-top: auto; }

    @media (max-width: 950px) {
        .game-area { flex-direction: column; align-items: center; }
        .game-sidebar { width: 100%; max-width: 600px; order: 2; }
        .canvas-wrapper { width: 100%; max-width: 600px; order: 1; }
        .checkers-wrapper { padding: 10px; padding-top: 80px; align-items: flex-start; }
        .game-chat { height: 300px; }
    }

    @media (max-width: 500px) {
        .checkers-wrapper { padding: 5px; padding-top: 70px; }
        .lobby-container { padding: 20px 15px; }
        .coin-balance { font-size: 1rem; }
        .game-chat { height: 250px; }
        .chat-input { padding: 5px; }
        .chat-input button { padding: 0 10px; font-size: 0.9rem; }
        
        .user-row { flex-direction: column; align-items: flex-start; gap: 5px; }
        .user-row button { width: 100%; }
        .user-row span { width: 100%; }
        
        /* Adjust game board size for very small screens if needed, 
           although aspect-ratio: 1/1 with max-width: 100% should handle it. */
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }

    .waiting-accept {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #6366f1;
      font-weight: 600;
      font-size: 0.9rem;
      animation: pulse-soft 2s infinite ease-in-out;
    }

    .dots span {
      animation: blink 1.4s infinite both;
      font-size: 1.2rem;
    }

    .dots span:nth-child(2) { animation-delay: 0.2s; }
    .dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes blink {
      0% { opacity: 0.2; }
      20% { opacity: 1; }
      100% { opacity: 0.2; }
    }

    @keyframes pulse-soft {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(0.98); }
    }

    /* Mobile Player Info - Top */
    .mobile-player-info {
      display: none;
      width: 100%;
      max-width: 600px;
      background: #2a2a2a;
      border-radius: 10px;
      padding: 12px 15px;
      margin-bottom: 10px;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .player-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #333;
      border-radius: 8px;
      flex: 1;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .player-badge.active {
      background: #374151;
      border: 2px solid #6366f1;
      animation: pulse 1.5s infinite;
    }

    .player-color {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .player-color.red { background: #ef4444; }
    .player-color.black { background: #111827; border: 2px solid #555; }

    .player-name {
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 80px;
    }

    .vs-badge {
      font-size: 0.75rem;
      font-weight: bold;
      color: #6366f1;
      flex-shrink: 0;
    }

    .player-color-dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
    }

    .player-color-dot.red { background: #ef4444; }
    .player-color-dot.black { background: #111827; border: 2px solid #555; }

    /* Result Modal */
    .result-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }

    .result-modal {
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      border-radius: 24px;
      padding: 40px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: scaleIn 0.4s ease;
    }

    .result-icon {
      font-size: 5rem;
      margin-bottom: 20px;
      animation: bounceIn 0.6s ease;
    }

    .result-icon.win { animation: winPulse 1.5s infinite; }
    .result-icon.lose { opacity: 0.8; }

    .result-title {
      font-size: 1.8rem;
      margin-bottom: 15px;
    }

    .result-title.win { color: #10b981; }
    .result-title.lose { color: #ef4444; }

    .result-coins {
      font-size: 2rem;
      font-weight: bold;
      color: #fbbf24;
      margin-bottom: 25px;
      animation: coinPop 0.5s ease 0.3s both;
    }

    .result-btn {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      border: none;
      padding: 15px 40px;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .result-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleIn {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    @keyframes bounceIn {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    @keyframes winPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    @keyframes coinPop {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    /* Desktop only */
    .desktop-only { display: block; }

    @media (max-width: 950px) {
        .game-area { flex-direction: column; align-items: center; }
        .game-sidebar { width: 100%; max-width: 600px; order: 2; }
        .canvas-wrapper { width: 100%; max-width: 600px; order: 1; }
        .checkers-wrapper { padding: 10px; padding-top: 80px; align-items: flex-start; }
        .game-chat { height: 300px; }
        .mobile-player-info { display: flex; order: 0; }
        .desktop-only { display: none; }
    }

    @media (max-width: 500px) {
        .checkers-wrapper { padding: 5px; padding-top: 70px; }
        .lobby-container { padding: 20px 15px; }
        .coin-balance { font-size: 1rem; }
        .game-chat { height: 250px; }
        .chat-input { padding: 5px; }
        .chat-input button { padding: 0 10px; font-size: 0.9rem; }
        
        .user-row { flex-direction: column; align-items: flex-start; gap: 5px; }
        .user-row button { width: 100%; }
        .user-row span { width: 100%; }
        
        .player-name { max-width: 60px; font-size: 0.8rem; }
        .result-modal { padding: 30px 20px; }
        .result-icon { font-size: 4rem; }
        .result-title { font-size: 1.5rem; }
    }
  
  `]
})
export class CheckersComponent implements OnInit, OnDestroy {
  @ViewChild('gameContainer') gameContainer!: ElementRef;
  @ViewChild('chatScroll') chatScroll!: ElementRef;

  public socket = inject(SocketService);
  public voiceChat = inject(VoiceChatService);
  private auth = inject(AuthService);
  private gamification = inject(GamificationService);
  private lang = inject(LanguageService);
  private router = inject(Router);

  currentUserId = 0;
  coins = this.gamification.userCoins;
  returnUrl: string | null = null;
  betAmount = 50;

  gameStarted = signal(false);
  invitation = signal<any>(null);
  onlinePlayers = signal<number[]>([]);
  waitingForInviteTo = signal<number | null>(null);

  chatMessages = signal<any[]>([]);
  newMessage = '';

  // Phaser Game instance
  private phaserGame?: Phaser.Game;
  private gameScene?: CheckersScene;

  // Simple game state
  roomId = signal('');
  redPlayerId = signal(0);
  blackPlayerId = signal(0);
  currentTurn = signal(0);
  partnerName = 'Partner';

  // Game Result Modal
  showGameResult = signal(false);
  gameResultWin = signal(false);
  private winSound = new Audio('/mp3/Game_succes.mp3');

  ngOnInit() {
    if (history.state['returnUrl']) {
      this.returnUrl = history.state['returnUrl'];
    }

    const user = this.auth.currentUserValue;
    if (user) this.currentUserId = Number(user.id);
    console.log('Checkers Init: User ID', this.currentUserId);

    // Set initial online players
    this.onlinePlayers.set(Array.from(this.socket.onlineUsers()));

    // Listen for status changes
    this.socket.userStatusChanged$.subscribe(() => {
      this.onlinePlayers.set(Array.from(this.socket.onlineUsers()));
    });

    // Listen for checkers events
    this.socket.checkersInvite$.subscribe(invite => {
      this.invitation.set(invite);
      this.socket.playNotificationSound();
    });

    // Check for active game
    const activeGame = this.socket.activeCheckersGame();
    if (activeGame) {
      this.initGame(activeGame);
    }

    this.socket.checkersStart$.subscribe(data => {
      this.initGame(data);
    });

    this.socket.checkersMove$.subscribe(data => {
      if (this.gameScene) {
        this.gameScene.handleOpponentMove(data.move);
      }
      this.currentTurn.set(this.currentTurn() === this.redPlayerId() ? this.blackPlayerId() : this.redPlayerId());
    });

    this.socket.checkersChat$.subscribe(data => {
      this.chatMessages.update(msgs => [...msgs, { ...data, id: 'checkers_' + Date.now() }]);
      setTimeout(() => this.scrollToBottom(), 100);
    });

    this.socket.translationResult$.subscribe(data => {
      this.chatMessages.update(msgs => msgs.map(m =>
        m.id === data.messageId ? { ...m, translatedText: data.translatedText } : m
      ));
    });

    this.socket.checkersGameOver$.subscribe(data => {
      this.onGameOver(data.winnerId);
    });

    this.socket.checkersError$.subscribe(err => {
      alert(err.message);
      this.waitingForInviteTo.set(null);
    });

    this.socket.checkersRejected$.subscribe(() => {

      this.waitingForInviteTo.set(null);

    });



    this.socket.partnerLeft$.subscribe(() => {
      if (this.gameStarted()) {
        this.onGameOver(this.currentUserId);
      }
    });

    // Checkers Cancelled (sender cancelled their invite)
    this.socket.checkersCancelled$.subscribe(() => {
      this.invitation.set(null);
    });
  }

  // Placeholder for partner name logic - should be updated based on opponent data
  get partnerNameTranslated() {
    return this.partnerName === 'Partner' ? this.lang.translate('CHECKERS.PARTNER_DEFAULT') : this.partnerName;
  }

  ngOnDestroy() {
    if (this.phaserGame) {
      this.phaserGame.destroy(true);
    }
    if (this.roomId()) {
      this.socket.leaveChat(this.roomId());
    }

    // Safety Force Reload if leaving mid-game to prevent stuck state
    if (this.gameStarted()) {
      window.location.reload();
    }
    this.socket.clearCheckersGame();
  }

  sendInvite(userId: number) {
    if (this.coins() < this.betAmount) {
      alert(this.lang.translate('ALERTS.NOT_ENOUGH_COINS'));
      return;
    }
    this.waitingForInviteTo.set(userId);
    this.socket.sendCheckersInvite(userId, this.betAmount);
  }

  acceptInvite() {
    const invite = this.invitation();
    if (!invite) return;

    if (this.coins() < invite.amount) {
      alert(this.lang.translate('ALERTS.NOT_ENOUGH_COINS'));
      return;
    }

    this.socket.acceptCheckersInvite(invite.socketId, invite.amount);
    this.invitation.set(null);
  }

  rejectInvite() {
    const invite = this.invitation();
    if (invite) {
      this.socket.rejectCheckersInvite(invite.socketId);
    }
    this.invitation.set(null);
  }

  initGame(data: any) {
    this.roomId.set(data.roomId);
    this.betAmount = Number(data.amount);
    this.redPlayerId.set(Number(data.players[0]));
    this.blackPlayerId.set(Number(data.players[1]));
    this.currentTurn.set(Number(data.turn));

    console.log('Checkers Game Initialized:', {
      roomId: this.roomId(),
      red: this.redPlayerId(),
      black: this.blackPlayerId(),
      turn: this.currentTurn(),
      me: this.currentUserId
    });

    // Deduct coins first
    this.gamification.bet(this.betAmount, 'checkers').subscribe({
      next: () => {
        this.waitingForInviteTo.set(null);
        this.gameStarted.set(true);

        // Initialize Phaser with delay to ensure container is ready
        setTimeout(() => {
          if (!this.gameStarted()) return; // Double check

          const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: 'checkers-container',
            scale: {
              mode: Phaser.Scale.FIT,
              autoCenter: Phaser.Scale.CENTER_BOTH,
              width: 600,
              height: 600
            },
            scene: [new CheckersScene(this)],
            backgroundColor: '#000000'
          };
          this.phaserGame = new Phaser.Game(config);
        }, 100);
      },
      error: (err) => {
        console.error("Bet failed", err);
        alert(this.lang.translate('ALERTS.INSUFFICIENT_COINS'));
        this.leaveGame(); // or just reset
      }
    });
  }

  isMyTurn() {
    return this.currentTurn() === this.currentUserId;
  }

  isRedPlayer() {
    return this.currentUserId === this.redPlayerId();
  }

  translateMessage(msg: any) {
    this.socket.emit('translate_message', {
      messageId: msg.id,
      text: msg.message,
      targetLang: this.lang.currentLang()
    });
  }

  sendMove(move: any) {
    this.socket.sendCheckersMove(this.roomId(), move);
    this.currentTurn.set(this.currentTurn() === this.redPlayerId() ? this.blackPlayerId() : this.redPlayerId());
  }

  sendChat() {
    if (!this.newMessage.trim()) return;
    this.socket.sendCheckersChat(this.roomId(), this.newMessage);
    this.newMessage = '';
  }

  onGameOver(winnerId: number) {
    const isWinner = winnerId === this.currentUserId;

    if (isWinner) {
      this.gamification.win(this.betAmount * 2, 'checkers').subscribe();
      this.playWinSound();
    }

    // Show result modal instead of alert
    this.gameResultWin.set(isWinner);
    this.showGameResult.set(true);

    this.gameStarted.set(false);
    if (this.phaserGame) {
      this.phaserGame.destroy(true);
      this.phaserGame = undefined;
    }
    this.socket.clearCheckersGame();
  }

  closeResultAndNavigate() {
    this.showGameResult.set(false);
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.router.navigate(['/dashboard/games']);
    }
  }

  leaveGame() {
    if (confirm("Are you sure? You will lose your bet!")) {
      this.gameStarted.set(false);
      if (this.phaserGame) {
        this.phaserGame.destroy(true);
        this.phaserGame = undefined;
      }
      this.socket.leaveChat(this.roomId());
      this.socket.clearCheckersGame();
      this.voiceChat.cleanup();

      if (this.returnUrl) {
        this.router.navigateByUrl(this.returnUrl);
      } else {
        this.router.navigate(['/dashboard/games']);
      }
    }
  }

  private scrollToBottom() {
    if (this.chatScroll) {
      this.chatScroll.nativeElement.scrollTop = this.chatScroll.nativeElement.scrollHeight;
    }
  }

  private playWinSound() {
    this.winSound.currentTime = 0;
    this.winSound.play().catch(e => console.error('Error playing win sound:', e));
  }

  // Voice Chat Integration
  toggleMic() {
    if (!this.voiceChat.isActive()) {
      // Start call (assuming partner ID is known)
      const partnerId = this.isRedPlayer() ? this.blackPlayerId() : this.redPlayerId();
      if (partnerId) {
        this.voiceChat.startCall(partnerId);
      }
    } else {
      this.voiceChat.toggleMute();
    }
  }

  retryVoiceConnection() {
    this.voiceChat.retryConnection();
  }
}

// Phaser Scene Class
class CheckersScene extends Phaser.Scene {
  private component: CheckersComponent;
  private board: number[][] = []; // 0: empty, 1: red, 2: black, 11: red-king, 22: black-king
  private pieces: Map<string, Phaser.GameObjects.Arc> = new Map();
  private kingLabels: Phaser.GameObjects.Text[] = [];
  private graphics?: Phaser.GameObjects.Graphics;

  private selectedPiece?: { r: number, c: number };
  private tileSize = 75; // 600 / 8

  constructor(component: CheckersComponent) {
    super('CheckersScene');
    this.component = component;
  }

  create() {
    (this.component as any).gameScene = this; // Store reference in component
    this.graphics = this.add.graphics();
    this.initBoard();
    this.drawBoard();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handleInput(pointer));
  }

  initBoard() {
    // 8x8 Board. 0 is empty.
    // Red starts at rows 0-2 (top if player is black, bottom if player is red)
    // To make it simple, player 1 is always red (bottom), player 2 is black (top)
    // We visually flip it if the current user is black.

    this.board = Array(8).fill(0).map(() => Array(8).fill(0));

    // Pieces placement
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 !== 0) {
          this.board[r][c] = 2; // Black at top
        }
      }
    }
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 !== 0) {
          this.board[r][c] = 1; // Red at bottom
        }
      }
    }
  }

  drawBoard() {
    if (!this.graphics) return;
    this.graphics.clear();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isDark = (r + c) % 2 !== 0;
        this.graphics!.fillStyle(isDark ? 0x2d3748 : 0xf1f5f9);
        this.graphics!.fillRect(c * this.tileSize, r * this.tileSize, this.tileSize, this.tileSize);
      }
    }

    // Draw pieces
    this.pieces.forEach(p => p.destroy());
    this.pieces.clear();
    this.kingLabels.forEach(l => l.destroy());
    this.kingLabels = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const val = this.board[r][c];
        if (val !== 0) {
          const color = (val === 1 || val === 11) ? 0xef4444 : 0x111827;
          const piece = this.add.circle(c * this.tileSize + this.tileSize / 2, r * this.tileSize + this.tileSize / 2, this.tileSize * 0.4, color);
          piece.setStrokeStyle(4, 0xffffff, 0.5);

          if (val > 10) { // King
            const label = this.add.text(c * this.tileSize + this.tileSize / 2 - 10, r * this.tileSize + this.tileSize / 2 - 15, 'K', { fontSize: '24px', fontStyle: 'bold' });
            this.kingLabels.push(label);
          }

          if (this.selectedPiece && this.selectedPiece.r === r && this.selectedPiece.c === c) {
            piece.setStrokeStyle(4, 0x6366f1, 1);
          }

          this.pieces.set(`${r},${c}`, piece);
        }
      }
    }
  }

  handleInput(pointer: Phaser.Input.Pointer) {
    if (!this.component.isMyTurn()) return;

    const c = Math.floor(pointer.x / this.tileSize);
    const r = Math.floor(pointer.y / this.tileSize);

    const val = this.board[r][c];
    const myType = this.component.currentUserId === this.component.redPlayerId() ? 1 : 2;

    if (val !== 0 && (val === myType || val === myType * 11)) {
      // Selection
      this.selectedPiece = { r, c };
      this.drawBoard();
    } else if (this.selectedPiece) {
      // Move attempt
      if (this.isValidMove(this.selectedPiece, { r, c })) {
        this.executeMove(this.selectedPiece, { r, c });
        this.component.sendMove({ from: this.selectedPiece, to: { r, c } });
        this.selectedPiece = undefined;
        this.drawBoard();

        // Win check
        if (this.checkWin()) {
          this.component.socket.sendCheckersGameOver(this.component.roomId(), this.component.currentUserId);
        }
      }
    }
  }

  isValidMove(from: { r: number, c: number }, to: { r: number, c: number }): boolean {
    if (this.board[to.r][to.c] !== 0) return false; // Target must be empty
    if ((to.r + to.c) % 2 === 0) return false; // Must be dark square

    const dy = to.r - from.r;
    const dx = Math.abs(to.c - from.c);
    const piece = this.board[from.r][from.c];

    // Basic move
    if (dx === 1) {
      if (piece === 1 && dy === -1) return true; // Red moves up
      if (piece === 2 && dy === 1) return true; // Black moves down
      if (piece > 10 && Math.abs(dy) === 1) return true; // Kings move any dir
    }

    // Jump
    if (dx === 2 && Math.abs(dy) === 2) {
      const midR = from.r + dy / 2;
      const midC = from.c + (to.c - from.c) / 2;
      const midVal = this.board[midR][midC];
      if (midVal === 0) return false;

      const myType = piece > 10 ? piece / 11 : piece;
      const enemyType = myType === 1 ? 2 : 1;

      if (midVal === enemyType || midVal === enemyType * 11) {
        if (piece === 1 && dy === -2) return true;
        if (piece === 2 && dy === 2) return true;
        if (piece > 10) return true;
      }
    }

    return false;
  }

  executeMove(from: { r: number, c: number }, to: { r: number, c: number }) {
    let piece = this.board[from.r][from.c];

    // Jump over
    if (Math.abs(to.r - from.r) === 2) {
      const midR = from.r + (to.r - from.r) / 2;
      const midC = from.c + (to.c - from.c) / 2;
      this.board[midR][midC] = 0;
    }

    this.board[to.r][to.c] = piece;
    this.board[from.r][from.c] = 0;

    // Promotion
    if (piece === 1 && to.r === 0) this.board[to.r][to.c] = 11;
    if (piece === 2 && to.r === 7) this.board[to.r][to.c] = 22;
  }

  handleOpponentMove(move: any) {
    this.executeMove(move.from, move.to);
    this.drawBoard();
  }

  checkWin(): boolean {
    // Very simple: check if opponent has pieces left
    const myId = this.component.currentUserId;
    const enemyType = myId === this.component.redPlayerId() ? 2 : 1;

    let enemyCount = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const val = this.board[r][c];
        if (val === enemyType || val === enemyType * 11) enemyCount++;
      }
    }
    return enemyCount === 0;
  }
}
