import { Component, OnInit, OnDestroy, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../../services/socket.service';
import { AuthService } from '../../../services/auth.service';
import { GamificationService } from '../../../services/gamification.service';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
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
              <p>User #{{ invitation().fromUserId }} {{ 'CHECKERS.INVITED_YOU' | translate }} {{ invitation().amount }} 🪙</p>
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
                            <span>Player #{{ userId }}</span>
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
        <div class="canvas-wrapper">
          <div id="checkers-container" #gameContainer></div>
        </div>
        
        <div class="game-sidebar">
          <div class="game-info">
            <div class="player-info">
              <div class="p-red" [class.active]="currentTurn() === redPlayerId()">{{ 'CHECKERS.RED' | translate }} (Player {{ redPlayerId() }})</div>
              <div class="p-black" [class.active]="currentTurn() === blackPlayerId()">{{ 'CHECKERS.BLACK' | translate }} (Player {{ blackPlayerId() }})</div>
            </div>
            <div class="turn-indicator" [class.my-turn]="isMyTurn()">
              {{ isMyTurn() ? ('CHECKERS.YOUR_TURN' | translate) : ('CHECKERS.WAITING' | translate) }}
            </div>
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
    </div>
  `,
    styles: [`
    .checkers-wrapper {
      width: 100%;
      height: calc(100vh - 70px);
      display: flex;
      justify-content: center;
      align-items: center;
      background: #1a1a1a;
      color: white;
      padding: 20px;
    }
    .lobby-container {
      background: #2a2a2a;
      padding: 30px;
      border-radius: 15px;
      width: 400px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .coin-balance { font-size: 1.2rem; margin: 15px 0; color: #fbbf24; }
    .bet-input { margin-bottom: 20px; }
    .bet-input input { padding: 8px; border-radius: 5px; border: none; width: 100px; margin-left: 10px; background: #333; color: white; }
    
    .online-users { text-align: left; background: #1a1a1a; padding: 15px; border-radius: 10px; margin-top: 20px; }
    .user-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #333; }
    .invite-btn, .accept-btn { background: #6366f1; color: white; border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer; }
    .reject-btn { background: #ef4444; color: white; border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer; margin-left: 10px; }
    .invitation-card { background: #374151; padding: 20px; border-radius: 10px; margin-top: 20px; border: 2px solid #6366f1; }

    .game-area { display: flex; gap: 20px; max-width: 1000px; width: 100%; }
    .canvas-wrapper {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        min-width: 0;
    }
    .hidden { display: none; }
    #checkers-container { 
        background: #000; 
        border-radius: 10px; 
        overflow: hidden; 
        border: 4px solid #333;
        width: 100%;
        max-width: 600px;
        aspect-ratio: 1 / 1;
    }
    #checkers-container canvas {
        width: 100% !important;
        height: auto !important;
    }
    
    .game-sidebar { width: 300px; display: flex; flex-direction: column; gap: 20px; }
    .game-info { background: #2a2a2a; padding: 15px; border-radius: 10px; }
    .player-info { display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; }
    .p-red, .p-black { padding: 8px; border-radius: 5px; background: #333; }
    .active { border: 2px solid #6366f1; background: #374151; }
    .turn-indicator { text-align: center; font-weight: bold; padding: 10px; border-radius: 5px; background: #333; }
    .my-turn { background: #059669; color: white; animation: pulse 1.5s infinite; }

    .game-chat { flex-grow: 1; background: #2a2a2a; border-radius: 10px; display: flex; flex-direction: column; height: 350px; }
    .chat-messages { flex-grow: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
    .chat-msg { background: #374151; padding: 8px 30px 8px 8px; border-radius: 8px; max-width: 90%; align-self: flex-start; position: relative; }
    .chat-msg.own { background: #6366f1; align-self: flex-end; padding-right: 8px; }
    .sender { font-size: 0.7rem; display: block; opacity: 0.7; }
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
    .chat-input input { flex-grow: 1; background: #333; border: none; color: white; padding: 8px; border-radius: 5px; }
    .chat-input button { background: #6366f1; border: none; color: white; padding: 0 15px; border-radius: 5px; cursor: pointer; }

    .leave-btn { background: #ef4444; color: white; border: none; padding: 10px; border-radius: 5px; font-weight: bold; cursor: pointer; }

    @media (max-width: 950px) {
        .game-area { flex-direction: column; align-items: center; }
        .game-sidebar { width: 100%; max-width: 600px; }
        .checkers-wrapper { height: auto; padding-top: 80px; }
        .game-chat { height: 300px; }
    }

    @media (max-width: 500px) {
        .lobby-container { width: 100%; }
        .online-users { max-height: 300px; overflow-y: auto; }
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
  `]
})
export class CheckersComponent implements OnInit, OnDestroy {
    @ViewChild('gameContainer') gameContainer!: ElementRef;
    @ViewChild('chatScroll') chatScroll!: ElementRef;

    public socket = inject(SocketService);
    private auth = inject(AuthService);
    private gamification = inject(GamificationService);
    private lang = inject(LanguageService);

    currentUserId = 0;
    coins = this.gamification.userCoins;
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

    ngOnInit() {
        const user = this.auth.currentUserValue;
        if (user) this.currentUserId = user.id;

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

        });    }

    ngOnDestroy() {
        if (this.phaserGame) {
            this.phaserGame.destroy(true);
        }
        if (this.roomId()) {
            this.socket.leaveChat(this.roomId());
        }
        this.socket.clearCheckersGame();
    }

    sendInvite(userId: number) {
        if (this.coins() < this.betAmount) {
            alert("Not enough coins!");
            return;
        }
        this.waitingForInviteTo.set(userId);
        this.socket.sendCheckersInvite(userId, this.betAmount);
    }

    acceptInvite() {
        const invite = this.invitation();
        if (!invite) return;

        if (this.coins() < invite.amount) {
            alert("Not enough coins!");
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
        this.betAmount = data.amount;
        this.redPlayerId.set(Number(data.players[0]));
        this.blackPlayerId.set(Number(data.players[1]));
        this.currentTurn.set(Number(data.turn));

        // Deduct coins
        this.gamification.bet(this.betAmount, 'checkers').subscribe();
        this.waitingForInviteTo.set(null);
        this.gameStarted.set(true);

        // Initialize Phaser with delay to ensure container is ready
        setTimeout(() => {
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
    }

    isMyTurn() {
        return this.currentTurn() === this.currentUserId;
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
        const msg = isWinner ? `${this.lang.translate('CHECKERS.VICTORY')} ${this.betAmount * 2} 🪙` : this.lang.translate('CHECKERS.LOSE');
        alert(msg);

        if (isWinner) {
            this.gamification.win(this.betAmount * 2, 'checkers').subscribe();
        }

        this.gameStarted.set(false);
        if (this.phaserGame) {
            this.phaserGame.destroy(true);
            this.phaserGame = undefined;
        }
        this.socket.clearCheckersGame();
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
        }
    }

    private scrollToBottom() {
        if (this.chatScroll) {
            this.chatScroll.nativeElement.scrollTop = this.chatScroll.nativeElement.scrollHeight;
        }
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
