import { Component, OnInit, OnDestroy, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SocketService } from '../../../services/socket.service';
import { AuthService } from '../../../services/auth.service';
import { GamificationService } from '../../../services/gamification.service';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { AdsterraBannerComponent } from '../../../components/adsterra-banner/adsterra-banner.component';

enum PieceColor { WHITE = 1, BLACK = 2 }

interface Piece {
    color: PieceColor;
    isKing: boolean;
}

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

@Component({
    selector: 'app-checkers',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe, AdsterraBannerComponent],
    template: `
    <div class="checkers-page">
        <!-- Header -->
        <div class="game-header">
            <button class="btn-back" (click)="leaveGame()">
                <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>
            </button>
            <div class="title-section">
                <h1>{{ 'GAMES.CHECKERS' | translate }}</h1>
                <div class="difficulty-badge" [class]="difficulty()">
                    {{ difficulty() }}
                </div>
            </div>
            <div class="wallet-mini">
                <span>{{ coins() }}</span>
                <span class="coin-icon">🪙</span>
            </div>
        </div>

        <!-- Ad Banner Container -->
        <div class="ad-banner-container flex flex-col items-center justify-center w-full ad-wrapper" style="margin-bottom: 20px;">
            <div class="hidden md:flex">
                <app-adsterra-banner key="8342fca62e8c8234f4a70eb5ef1d0784" [width]="728" [height]="90"></app-adsterra-banner>
            </div>
            <div class="flex md:hidden">
                <app-adsterra-banner key="dbce7f5203c055b563c8ee393acb030e" [width]="320" [height]="50"></app-adsterra-banner>
            </div>
        </div>

        <!-- Lobby / Setup -->
        @if (!gameStarted()) {
            <div class="lobby-card">
                <div class="setup-section">
                    <div class="bot-hero">
                        <div class="hero-icon">🤖</div>
                        <h3>{{ 'CHECKERS.VS_BOT' | translate }}</h3>
                        <p>{{ 'CHECKERS.BOT_DESC' | translate }}</p>
                    </div>

                    <div class="difficulty-label">{{ 'CHECKERS.SELECT_DIFFICULTY' | translate }}</div>
                    <div class="difficulty-grid">
                        @for (diff of difficulties; track diff) {
                            <button [class.selected]="difficulty() === diff" (click)="difficulty.set(diff)">
                                {{ diff }}
                            </button>
                        }
                    </div>

                    <div class="fixed-bet">
                        <span class="label">{{ 'CHECKERS.BET_AMOUNT' | translate }}</span>
                        <div class="bet-value">
                            <span class="amount">1</span>
                            <span class="coin-icon">🪙</span>
                        </div>
                    </div>

                    <button class="btn-start" (click)="startSinglePlayer()">
                        {{ 'GAMES.START' | translate }}
                    </button>
                </div>
            </div>
        } @else {
            <!-- Game Board -->
            <div class="game-container">
                <div class="stats-bar">
                    <div class="player-stat" [class.active]="currentPlayer() === PieceColor.WHITE">
                        <div class="avatar white"></div>
                        <div class="info">
                            <span class="name">{{ isRedPlayer() ? ('CHECKERS.YOU' | translate) : 'Opponent' }}</span>
                            <span class="score">{{ scoreWhite() }} captured</span>
                        </div>
                    </div>
                    <div class="vs-divider">VS</div>
                    <div class="player-stat" [class.active]="currentPlayer() === PieceColor.BLACK">
                        <div class="avatar black"></div>
                        <div class="info">
                            <span class="name">{{ !isRedPlayer() ? ('CHECKERS.YOU' | translate) : (mode() === 'SP' ? 'Bot' : 'Opponent') }}</span>
                            <span class="score">{{ scoreBlack() }} captured</span>
                        </div>
                    </div>
                </div>

                <div class="board-wrapper">
                    <div class="board" [class.is-bot-moving]="isBotMoving()">
                        @for (row of [0,1,2,3,4,5,6,7]; track row) {
                            @for (col of [0,1,2,3,4,5,6,7]; track col) {
                                <div class="cell" 
                                    [class.dark]="(row + col) % 2 === 1"
                                    [class.selected]="selectedSquare()?.r === row && selectedSquare()?.c === col"
                                    (click)="onSquareClick(row, col)">
                                    
                                    @if (board()[row][col]; as piece) {
                                        <div class="piece" 
                                            [class.white]="piece.color === PieceColor.WHITE"
                                            [class.black]="piece.color === PieceColor.BLACK"
                                            [class.king]="piece.isKing">
                                            @if (piece.isKing) { <span class="crown">👑</span> }
                                        </div>
                                    }
                                </div>
                            }
                        }
                    </div>
                    @if (isBotMoving()) {
                        <div class="bot-overlay">
                            <div class="brain-loader">🧠</div>
                            <span>Bot is thinking...</span>
                        </div>
                    }
                </div>

                <div class="turn-label">
                    {{ currentPlayer() === PieceColor.WHITE ? ('CHECKERS.TURN_WHITE' | translate) : ('CHECKERS.TURN_BLACK' | translate) }}
                </div>
            </div>
        }

        <!-- Game Over Modal -->
        @if (gameOver()) {
            <div class="modal-overlay">
                <div class="modal-card result-card" [class.win]="isUserWinner()">
                    <div class="result-icon">{{ isUserWinner() ? '🏆' : '💀' }}</div>
                    <h2>{{ isUserWinner() ? ('CHECKERS.VICTORY' | translate) : ('CHECKERS.DEFEAT' | translate) }}</h2>
                    <p>{{ isUserWinner() ? ('CHECKERS.WIN_MSG' | translate) : ('CHECKERS.LOSS_MSG' | translate) }}</p>
                    <div class="reward" *ngIf="isUserWinner()">
                        <span>+{{ betAmount() * 2 }}</span>
                        <span class="coin-icon">🪙</span>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-primary" (click)="restartGame()">{{ 'GAMES.PLAY_AGAIN' | translate }}</button>
                        <button class="btn-secondary" (click)="leaveGame()">{{ 'GAMES.EXIT' | translate }}</button>
                    </div>
                </div>
            </div>
        }
    </div>
    `,
    styles: [`
        .checkers-page {
            min-height: 100vh;
            background: #0f172a;
            color: #f8fafc;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .game-header {
            width: 100%;
            max-width: 600px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
        }

        .btn-back {
            background: rgba(255,255,255,0.05);
            border: none;
            color: white;
            padding: 10px;
            border-radius: 12px;
            cursor: pointer;
        }

        .title-section { text-align: center; }
        .title-section h1 { margin: 0; font-size: 1.5rem; }
        
        .difficulty-badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 4px;
        }
        .difficulty-badge.EASY { background: #10b981; color: white; }
        .difficulty-badge.MEDIUM { background: #f59e0b; color: white; }
        .difficulty-badge.HARD { background: #ef4444; color: white; }
        .difficulty-badge.EXPERT { background: #8b5cf6; color: white; }

        .wallet-mini {
            background: rgba(255,255,255,0.05);
            padding: 8px 16px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: bold;
            color: #f59e0b;
        }

        .lobby-card {
            background: #1e293b;
            width: 100%;
            max-width: 500px;
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }

        .mode-selector {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 24px;
        }
        .mode-selector button {
            background: #334155;
            border: 2px solid transparent;
            color: #94a3b8;
            padding: 16px;
            border-radius: 16px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }
        .mode-selector button.active {
            background: #4f46e5;
            color: white;
            border-color: #818cf8;
        }
        .mode-selector .icon { font-size: 1.5rem; }

        .setup-section h3 { font-size: 1.1rem; margin-bottom: 16px; color: #cbd5e1; }
        
        .difficulty-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 20px;
        }
        .difficulty-grid button {
            background: #334155;
            border: none;
            color: white;
            padding: 12px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
        }
        .difficulty-grid button.selected { background: #4f46e5; }

        .fixed-bet {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255,255,255,0.05);
            padding: 16px;
            border-radius: 16px;
            margin-bottom: 24px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .fixed-bet .label { color: #94a3b8; font-weight: 500; }
        .fixed-bet .bet-value {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.25rem;
            font-weight: 800;
            color: #f59e0b;
        }

        .bot-hero {
            text-align: center;
            margin-bottom: 32px;
        }
        .bot-hero .hero-icon { font-size: 4rem; margin-bottom: 12px; }
        .bot-hero h3 { font-size: 1.5rem; margin: 0; color: white; }
        .bot-hero p { color: #94a3b8; font-size: 0.9rem; margin-top: 8px; }
        .difficulty-label { color: #94a3b8; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-weight: 700; }

        .btn-start {
            width: 100%;
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white;
            border: none;
            padding: 16px;
            border-radius: 16px;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3);
        }

        /* Online Players List */
        .player-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; }
        .player-row {
            background: #334155;
            padding: 12px 16px;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .btn-invite { background: #4f46e5; border: none; color: white; padding: 6px 12px; border-radius: 8px; cursor: pointer; }

        /* Game UI */
        .game-container {
            width: 100%;
            max-width: 600px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .stats-bar {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #1e293b;
            padding: 12px;
            border-radius: 20px;
            margin-bottom: 20px;
        }
        .player-stat {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 16px;
            border-radius: 16px;
            transition: all 0.3s;
        }
        .player-stat.active { background: rgba(79, 70, 229, 0.2); border: 1px solid #4f46e5; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; }
        .avatar.white { background: #f8fafc; border: 2px solid #cbd5e1; }
        .avatar.black { background: #0f172a; border: 2px solid #334155; }
        .info { display: flex; flex-direction: column; }
        .info .name { font-weight: bold; font-size: 0.9rem; }
        .info .score { font-size: 0.75rem; color: #94a3b8; }
        .vs-divider { font-weight: bold; color: #4f46e5; opacity: 0.5; }

        .board-wrapper {
            position: relative;
            width: 100%;
            max-width: 500px;
            aspect-ratio: 1;
            padding: 10px;
            background: #334155;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }

        .board {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            grid-template-rows: repeat(8, 1fr);
            width: 100%;
            height: 100%;
            border: 4px solid #1e293b;
            background: #cbd5e1; /* Light squares */
        }

        .cell {
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            position: relative;
        }
        .cell.dark { background: #475569; }
        .cell.selected { background: rgba(245, 158, 11, 0.4) !important; }

        .piece {
            width: 80%;
            height: 80%;
            border-radius: 50%;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 2;
        }
        .piece:hover { transform: scale(1.1); }
        .piece.white { 
            background: radial-gradient(circle at 30% 30%, #ffffff 0%, #cbd5e1 100%);
            border: 2px solid #94a3b8;
        }
        .piece.black { 
            background: radial-gradient(circle at 30% 30%, #334155 0%, #0f172a 100%);
            border: 2px solid #1e293b;
        }
        .piece.king { border-width: 4px; border-style: double; }
        .crown { font-size: 1.2rem; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5)); }

        .bot-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(2px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            z-index: 10;
            border-radius: 8px;
        }
        .brain-loader { font-size: 3rem; animation: float 2s infinite ease-in-out; }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }

        .turn-label {
            margin-top: 20px;
            padding: 8px 24px;
            background: #1e293b;
            border-radius: 20px;
            font-weight: bold;
            color: #4f46e5;
        }

        /* Modal */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
        }
        .modal-card {
            background: #1e293b;
            padding: 40px;
            border-radius: 32px;
            text-align: center;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 30px 60px rgba(0,0,0,0.5);
            animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .result-icon { font-size: 5rem; margin-bottom: 20px; }
        .result-card.win h2 { color: #10b981; }
        .result-card.win { border: 2px solid #10b981; }
        .result-card.lose h2 { color: #ef4444; }
        
        .reward {
            font-size: 2rem;
            font-weight: bold;
            color: #f59e0b;
            margin: 20px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .modal-actions { display: flex; flex-direction: column; gap: 12px; margin-top: 32px; }
        .btn-primary { 
            background: #4f46e5; color: white; border: none; padding: 16px; border-radius: 16px; 
            font-weight: bold; cursor: pointer; font-size: 1rem;
        }
        .btn-secondary { background: transparent; color: #94a3b8; border: 1px solid #334155; padding: 12px; border-radius: 16px; cursor: pointer; }

        @media (max-width: 500px) {
            .board-wrapper { padding: 5px; }
            .piece { width: 85%; height: 85%; }
            .crown { font-size: 0.9rem; }
        }
    `]
})
export class CheckersComponent implements OnInit, OnDestroy {
    private socket = inject(SocketService);
    private auth = inject(AuthService);
    private gamification = inject(GamificationService);
    private lang = inject(LanguageService);
    private router = inject(Router);

    PieceColor = PieceColor;
    currentUserId = 0;
    coins = this.gamification.userCoins;
    
    // Game State
    gameStarted = signal(false);
    mode = signal<'SP' | 'MP'>('SP');
    difficulty = signal<Difficulty>('EASY');
    betAmount = signal(1);
    gameOver = signal(false);
    isUserWinner = signal(false);
    
    board = signal<(Piece | null)[][]>(this.createInitialBoard());
    currentPlayer = signal<PieceColor>(PieceColor.WHITE);
    selectedSquare = signal<{r: number, c: number} | null>(null);
    scoreWhite = signal(0);
    scoreBlack = signal(0);
    isBotMoving = signal(false);

    // Online State
    onlinePlayers = signal<number[]>([]);
    invitation = signal<any>(null);
    roomId = signal('');
    redPlayerId = signal(0); // Player 1
    blackPlayerId = signal(0); // Player 2 / Bot

    difficulties: Difficulty[] = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'];

    private destroy$ = new Subject<void>();

    ngOnInit() {
        const user = this.auth.currentUserValue;
        if (user) this.currentUserId = Number(user.id);

        this.onlinePlayers.set(Array.from(this.socket.onlineUsers()));
        this.socket.userStatusChanged$.pipe(takeUntil(this.destroy$)).subscribe(() => {
            this.onlinePlayers.set(Array.from(this.socket.onlineUsers()));
        });

        this.socket.checkersInvite$.pipe(takeUntil(this.destroy$)).subscribe(invite => {
            this.invitation.set(invite);
            this.mode.set('MP');
        });

        this.socket.checkersStart$.pipe(takeUntil(this.destroy$)).subscribe(data => {
            this.initMultiplayerGame(data);
        });

        this.socket.checkersMove$.pipe(takeUntil(this.destroy$)).subscribe(data => {
            if (this.mode() === 'MP') {
                this.handleOpponentMove(data.move);
            }
        });

        this.socket.checkersGameOver$.pipe(takeUntil(this.destroy$)).subscribe(data => {
            this.onGameOver(data.winnerId === this.currentUserId);
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.roomId()) this.socket.emit('leave_checkers_game', { roomId: this.roomId() });
    }

    private createInitialBoard(): (Piece | null)[][] {
        const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
        // Black pieces (top)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) board[r][c] = { color: PieceColor.BLACK, isKing: false };
            }
        }
        // White pieces (bottom)
        for (let r = 5; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) board[r][c] = { color: PieceColor.WHITE, isKing: false };
            }
        }
        return board;
    }

    startSinglePlayer() {
        if (this.coins() < this.betAmount()) {
            alert('Not enough coins');
            return;
        }
        this.gamification.bet(this.betAmount(), 'checkers').subscribe(() => {
            this.board.set(this.createInitialBoard());
            this.currentPlayer.set(PieceColor.WHITE);
            this.gameStarted.set(true);
            this.gameOver.set(false);
            this.scoreWhite.set(0);
            this.scoreBlack.set(0);
        });
    }

    sendInvite(userId: number) {
        if (this.coins() < this.betAmount()) return alert('Not enough coins');
        this.socket.sendCheckersInvite(userId, this.betAmount());
    }

    acceptInvite() {
        const inv = this.invitation();
        if (!inv) return;
        this.socket.acceptCheckersInvite(inv.socketId, inv.amount);
        this.invitation.set(null);
    }

    rejectInvite() {
        const inv = this.invitation();
        if (inv) this.socket.rejectCheckersInvite(inv.socketId);
        this.invitation.set(null);
    }

    private initMultiplayerGame(data: any) {
        this.roomId.set(data.roomId);
        this.redPlayerId.set(data.players[0]);
        this.blackPlayerId.set(data.players[1]);
        this.currentPlayer.set(data.turn);
        this.gameStarted.set(true);
        this.board.set(this.createInitialBoard());
        this.scoreWhite.set(0);
        this.scoreBlack.set(0);
    }

    onSquareClick(r: number, c: number) {
        if (this.gameOver() || this.isBotMoving()) return;
        if (this.mode() === 'MP' && this.currentPlayer() !== (this.isRedPlayer() ? PieceColor.WHITE : PieceColor.BLACK)) return;

        const piece = this.board()[r][c];
        if (piece && piece.color === this.currentPlayer()) {
            this.selectedSquare.set({ r, c });
        } else if (this.selectedSquare()) {
            const from = this.selectedSquare()!;
            if (this.isValidMove(from, { r, c }, this.board(), this.currentPlayer())) {
                this.makeMove(from, { r, c });
            }
        }
    }

    private makeMove(from: {r: number, c: number}, to: {r: number, c: number}) {
        const newBoard = this.board().map(row => [...row]);
        const piece = { ...newBoard[from.r][from.c]! };
        newBoard[from.r][from.c] = null;

        // Handle Jump
        if (Math.abs(to.r - from.r) === 2) {
            const midR = (from.r + to.r) / 2;
            const midC = (from.c + to.c) / 2;
            newBoard[midR][midC] = null;
            if (this.currentPlayer() === PieceColor.WHITE) this.scoreWhite.update(s => s + 1);
            else this.scoreBlack.update(s => s + 1);
        }

        // King Promotion
        if (this.currentPlayer() === PieceColor.WHITE && to.r === 0) piece.isKing = true;
        if (this.currentPlayer() === PieceColor.BLACK && to.r === 7) piece.isKing = true;

        newBoard[to.r][to.c] = piece;
        this.board.set(newBoard);
        this.selectedSquare.set(null);

        const nextPlayer = this.currentPlayer() === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
        
        // Multi-jump check
        if (Math.abs(to.r - from.r) === 2 && this.canCaptureMore(to, newBoard, this.currentPlayer())) {
            this.selectedSquare.set(to);
            // Don't switch player
        } else {
            this.currentPlayer.set(nextPlayer);
            if (this.mode() === 'MP') {
                this.socket.sendCheckersMove(this.roomId(), { from, to });
            }
            
            // Bot Turn
            if (this.mode() === 'SP' && nextPlayer === PieceColor.BLACK && !this.checkWinner(newBoard)) {
                this.triggerBotMove();
            }
        }

        const winner = this.checkWinner(newBoard);
        if (winner) {
            this.onGameOver(winner === PieceColor.WHITE);
        }
    }

    private triggerBotMove() {
        this.isBotMoving.set(true);
        setTimeout(() => {
            const bestMove = this.findBestMove(this.board(), this.difficulty());
            if (bestMove) {
                this.makeMove(bestMove.from, bestMove.to);
            }
            this.isBotMoving.set(false);
        }, 800 + Math.random() * 500);
    }

    private handleOpponentMove(move: any) {
        // Implement local update based on socket move
        const newBoard = this.board().map(row => [...row]);
        const piece = { ...newBoard[move.from.r][move.from.c]! };
        newBoard[move.from.r][move.from.c] = null;
        if (Math.abs(move.to.r - move.from.r) === 2) {
            newBoard[(move.from.r + move.to.r)/2][(move.from.c + move.to.c)/2] = null;
            if (piece.color === PieceColor.WHITE) this.scoreWhite.update(s => s + 1);
            else this.scoreBlack.update(s => s + 1);
        }
        if (piece.color === PieceColor.WHITE && move.to.r === 0) piece.isKing = true;
        if (piece.color === PieceColor.BLACK && move.to.r === 7) piece.isKing = true;
        newBoard[move.to.r][move.to.c] = piece;
        this.board.set(newBoard);
        this.currentPlayer.set(this.currentUserId === this.redPlayerId() ? PieceColor.WHITE : PieceColor.BLACK);
    }

    private isValidMove(from: {r: number, c: number}, to: {r: number, c: number}, board: (Piece|null)[][], player: PieceColor): boolean {
        if (to.r < 0 || to.r > 7 || to.c < 0 || to.c > 7) return false;
        if (board[to.r][to.c]) return false;
        const dr = to.r - from.r;
        const dc = Math.abs(to.c - from.c);
        const piece = board[from.r][from.c];
        if (!piece) return false;

        if (dc === 1) {
            if (piece.isKing) return Math.abs(dr) === 1;
            return player === PieceColor.WHITE ? dr === -1 : dr === 1;
        }
        if (dc === 2 && Math.abs(dr) === 2) {
            if (!piece.isKing) {
                const validDr = player === PieceColor.WHITE ? -2 : 2;
                if (dr !== validDr) return false;
            }
            const midPiece = board[(from.r + to.r)/2][(from.c + to.c)/2];
            return midPiece !== null && midPiece.color !== player;
        }
        return false;
    }

    private canCaptureMore(pos: {r: number, c: number}, board: (Piece|null)[][], player: PieceColor): boolean {
        const dirs = [[2, 2], [2, -2], [-2, 2], [-2, -2]];
        return dirs.some(([dr, dc]) => this.isValidMove(pos, { r: pos.r + dr, c: pos.c + dc }, board, player));
    }

    private findBestMove(board: (Piece|null)[][], difficulty: Difficulty): {from: any, to: any} | null {
        const depth = difficulty === 'EASY' ? 2 : difficulty === 'MEDIUM' ? 3 : difficulty === 'HARD' ? 4 : 5;
        const possibleMoves = this.getAllValidMoves(board, PieceColor.BLACK);
        if (possibleMoves.length === 0) return null;

        // Mandatory jumps
        const jumps = possibleMoves.filter(m => Math.abs(m.from.r - m.to.r) === 2);
        if (jumps.length > 0) return jumps[Math.floor(Math.random() * jumps.length)];
        
        if (difficulty === 'EASY') return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

        let bestMove = null;
        let bestEval = -Infinity;

        for (const move of possibleMoves) {
            const simulated = this.simulateMove(board, move.from, move.to, PieceColor.BLACK);
            const evalScore = this.minimax(simulated, depth - 1, -Infinity, Infinity, false);
            if (evalScore > bestEval) {
                bestEval = evalScore;
                bestMove = move;
            }
        }
        return bestMove || possibleMoves[0];
    }

    private minimax(board: (Piece|null)[][], depth: number, alpha: number, beta: number, maximizing: boolean): number {
        if (depth === 0) return this.evaluateBoard(board);
        const winner = this.checkWinner(board);
        if (winner === PieceColor.BLACK) return 1000 + depth;
        if (winner === PieceColor.WHITE) return -1000 - depth;

        if (maximizing) {
            let maxEval = -Infinity;
            const moves = this.getAllValidMoves(board, PieceColor.BLACK);
            for (const move of moves) {
                const simulated = this.simulateMove(board, move.from, move.to, PieceColor.BLACK);
                const evalScore = this.minimax(simulated, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return moves.length === 0 ? -1000 : maxEval;
        } else {
            let minEval = Infinity;
            const moves = this.getAllValidMoves(board, PieceColor.WHITE);
            for (const move of moves) {
                const simulated = this.simulateMove(board, move.from, move.to, PieceColor.WHITE);
                const evalScore = this.minimax(simulated, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return moves.length === 0 ? 1000 : minEval;
        }
    }

    private evaluateBoard(board: (Piece|null)[][]): number {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (!p) continue;
                const val = p.isKing ? 30 : 10;
                const posBonus = p.color === PieceColor.BLACK ? r : 7 - r;
                if (p.color === PieceColor.BLACK) score += val + posBonus;
                else score -= (val + posBonus);
            }
        }
        return score;
    }

    private getAllValidMoves(board: (Piece|null)[][], player: PieceColor) {
        const moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c]?.color === player) {
                    const dirs = [[1,1],[1,-1],[-1,1],[-1,-1],[2,2],[2,-2],[-2,2],[-2,-2]];
                    for (const [dr, dc] of dirs) {
                        if (this.isValidMove({r,c}, {r: r+dr, c: c+dc}, board, player)) {
                            moves.push({ from: {r,c}, to: {r: r+dr, c: c+dc} });
                        }
                    }
                }
            }
        }
        return moves;
    }

    private simulateMove(board: (Piece|null)[][], from: any, to: any, player: PieceColor) {
        const newBoard = board.map(row => row.map(p => p ? { ...p } : null));
        const piece = newBoard[from.r][from.c]!;
        newBoard[from.r][from.c] = null;
        if (Math.abs(to.r - from.r) === 2) newBoard[(from.r+to.r)/2][(from.c+to.c)/2] = null;
        if (player === PieceColor.WHITE && to.r === 0) piece.isKing = true;
        if (player === PieceColor.BLACK && to.r === 7) piece.isKing = true;
        newBoard[to.r][to.c] = piece;
        return newBoard;
    }

    private checkWinner(board: (Piece|null)[][]): PieceColor | null {
        let whiteCount = 0, blackCount = 0;
        board.forEach(row => row.forEach(p => {
            if (p?.color === PieceColor.WHITE) whiteCount++;
            if (p?.color === PieceColor.BLACK) blackCount++;
        }));
        if (whiteCount === 0) return PieceColor.BLACK;
        if (blackCount === 0) return PieceColor.WHITE;
        return null;
    }

    private onGameOver(isWin: boolean) {
        this.gameOver.set(true);
        this.isUserWinner.set(isWin);
        if (isWin) this.gamification.win(this.betAmount() * 2, 'checkers').subscribe();
    }

    restartGame() {
        this.gameOver.set(false);
        this.board.set(this.createInitialBoard());
        this.currentPlayer.set(PieceColor.WHITE);
        this.scoreWhite.set(0);
        this.scoreBlack.set(0);
        if (this.mode() === 'SP') this.startSinglePlayer();
    }

    leaveGame() {
        if (this.gameStarted() && !this.gameOver()) {
            if (!confirm('Leave game? You will lose your bet.')) return;
        }
        this.gameStarted.set(false);
        this.router.navigate(['/dashboard/games']);
    }

    isRedPlayer() { 
        return this.mode() === 'SP' || this.currentUserId === this.redPlayerId(); 
    }
}
