import { Component, OnInit, signal, effect, ElementRef, ViewChild, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamificationService } from '../../../services/gamification.service';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { AdsterraBannerComponent } from '../../../components/adsterra-banner/adsterra-banner.component';

enum ArrowDirection { UP = 'UP', RIGHT = 'RIGHT', DOWN = 'DOWN', LEFT = 'LEFT' }

interface ArrowShape {
  id: number;
  cells: { r: number, c: number }[];
  direction: ArrowDirection;
  isCleared: boolean;
  isWrong: boolean;
  exitProgress: number;
  wrongFlash: number;
  color: string;
}

@Component({
  selector: 'app-arrows',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AdsterraBannerComponent],
  template: `
    <div class="game-wrapper" [class.dark]="isDark">
      <div class="header">
        <div class="level-badge">
          <span class="label">{{ 'ARROWS.LEVEL' | translate }}</span>
          <span class="value">{{ level() }}</span>
        </div>
        
        <div class="lives">
          @for (heart of [0,1,2,3,4]; track heart) {
            <span class="heart" [class.filled]="heart < lives()">
              {{ heart < lives() ? '❤️' : '🖤' }}
            </span>
          }
        </div>

        <button class="exit-btn" (click)="exit()">✕</button>
      </div>

      <!-- Ad Banner Container -->
      <div class="ad-banner-container flex flex-col items-center justify-center w-full ad-wrapper" style="margin-bottom: 5px;">
        <div class="hidden md:flex">
          <app-adsterra-banner key="8342fca62e8c8234f4a70eb5ef1d0784" [width]="728" [height]="90"></app-adsterra-banner>
        </div>
        <div class="flex md:hidden">
          <app-adsterra-banner key="dbce7f5203c055b563c8ee393acb030e" [width]="320" [height]="50"></app-adsterra-banner>
        </div>
      </div>

      <div class="board-container" #boardContainer>
        <canvas #gameCanvas></canvas>
        
        @if (!gameStarted()) {
          <div class="overlay start">
            <div class="content">
              <span class="icon">🎯</span>
              <h1>{{ 'ARROWS.TITLE' | translate }}</h1>
              <p>{{ 'ARROWS.DESC' | translate }}</p>
              
              <div class="bet-info">
                <span>{{ 'GAMES.BET_AMOUNT' | translate }}: 1 🪙</span>
              </div>

              <button class="start-btn" (click)="startGame()">{{ 'GAMES.START' | translate }}</button>
            </div>
          </div>
        }

        @if (isWin()) {
          <div class="overlay win">
            <div class="content">
              <span class="icon">⭐</span>
              <h1>{{ 'ARROWS.PERFECT' | translate }}</h1>
              <p>{{ 'ARROWS.LEVEL_CLEARED' | translate }}: {{ level() }}</p>
              <button class="next-btn" (click)="nextLevel()">{{ 'ARROWS.NEXT_LEVEL' | translate }}</button>
            </div>
          </div>
        }

        @if (isGameOver()) {
          <div class="overlay game-over">
            <div class="content">
              <span class="icon">💔</span>
              <h1>{{ 'ARROWS.GAME_OVER' | translate }}</h1>
              <p>{{ 'ARROWS.GAME_OVER_MSG' | translate }}</p>
              <button class="retry-btn" (click)="startGame()">{{ 'ARROWS.RETRY' | translate }}</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .game-wrapper {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #0d0d14;
      color: #e8e8f0;
      display: flex;
      flex-direction: column;
      z-index: 1000;
      font-family: 'Outfit', sans-serif;
    }
    .header {
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .level-badge {
      background: #16161f;
      padding: 8px 20px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 80px;
    }
    .level-badge .label { font-size: 10px; color: #6b6b88; letter-spacing: 1px; }
    .level-badge .value { font-size: 24px; font-weight: 900; }
    
    .lives { display: flex; gap: 5px; }
    .heart { font-size: 20px; transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .heart.filled { transform: scale(1.2); }
    
    .exit-btn {
      background: none; border: none; color: #6b6b88; font-size: 24px; cursor: pointer;
    }

    .board-container {
      flex: 1;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      margin: 10px;
    }
    canvas {
      max-width: 100%;
      max-height: 100%;
      touch-action: none;
    }

    .overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(13, 13, 20, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10;
      animation: fadeIn 0.5s ease;
    }
    .content {
      text-align: center;
      padding: 40px;
      max-width: 400px;
    }
    .content .icon { font-size: 60px; display: block; margin-bottom: 20px; }
    .content h1 { font-size: 32px; font-weight: 900; margin-bottom: 10px; }
    .content p { color: #6b6b88; margin-bottom: 30px; }
    
    .next-btn, .retry-btn, .start-btn {
      background: #7b9eff;
      color: white;
      border: none;
      padding: 15px 40px;
      border-radius: 15px;
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      transition: transform 0.2s;
    }
    .next-btn:hover, .retry-btn:hover, .start-btn:hover { transform: scale(1.02); }

    .bet-info {
      margin-bottom: 24px;
      font-weight: 700;
      color: #7b9eff;
      background: rgba(123, 158, 255, 0.1);
      padding: 10px 20px;
      border-radius: 12px;
      display: inline-block;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class ArrowsComponent implements OnInit {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('boardContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private gamification = inject(GamificationService);
  private router = inject(Router);

  isDark = true;
  rows = 14;
  cols = 10;
  level = signal(1);
  lives = signal(5);
  isWin = signal(false);
  isGameOver = signal(false);
  gameStarted = signal(false);
  arrows: ArrowShape[] = [];
  
  private ctx!: CanvasRenderingContext2D;
  private cellSize = 0;
  private startX = 0;
  private startY = 0;
  private animationFrameId?: number;

  private snakeColors = [
    '#7B9EFF', '#9FEFCB', '#FFB3DE', '#FFD580', '#B3AAFF', '#80E8FF', '#FF9F7F', '#C3FF80'
  ];

  ngOnInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.resize();
    this.render();
  }

  @HostListener('window:resize')
  resize() {
    const container = this.containerRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    
    canvas.width = container.clientWidth * window.devicePixelRatio;
    canvas.height = container.clientHeight * window.devicePixelRatio;
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = container.clientHeight + 'px';
    
    this.cellSize = Math.min(
      (canvas.width * 0.9) / this.cols,
      (canvas.height * 0.9) / this.rows
    );
    
    this.startX = (canvas.width - this.cellSize * this.cols) / 2;
    this.startY = (canvas.height - this.cellSize * this.rows) / 2;
  }

  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onPointerDown(event: any) {
    if (this.isWin() || this.isGameOver()) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = (event.clientX || event.touches[0].clientX) - rect.left;
    const y = (event.clientY || event.touches[0].clientY) - rect.top;
    
    const scaleX = this.canvasRef.nativeElement.width / rect.width;
    const scaleY = this.canvasRef.nativeElement.height / rect.height;
    
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    const col = Math.floor((canvasX - this.startX) / this.cellSize);
    const row = Math.floor((canvasY - this.startY) / this.cellSize);

    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      const arrow = this.arrows.find(a => !a.isCleared && a.cells.some(c => c.r === row && c.c === col));
      if (arrow) this.onArrowClick(arrow.id);
    }
  }

  startNewGame(level: number) {
    this.level.set(level);
    this.lives.set(5);
    this.isWin.set(false);
    this.isGameOver.set(false);
    this.arrows = this.generateLevel(this.rows, this.cols, level);
  }

  startGame() {
    this.gamification.bet(1, 'arrows').subscribe(() => {
      this.gameStarted.set(true);
      this.startNewGame(1);
    });
  }

  onArrowClick(id: number) {
    const arrow = this.arrows.find(a => a.id === id);
    if (!arrow || arrow.isCleared) return;

    if (this.canMoveOut(arrow)) {
      arrow.isCleared = true;
      this.animateClear(arrow);
      
      if (this.arrows.every(a => a.isCleared)) {
        setTimeout(() => this.isWin.set(true), 1000);
        this.gamification.win(this.level() * 5, 'arrows').subscribe();
      }
    } else {
      arrow.isWrong = true;
      arrow.wrongFlash = 1.0;
      this.lives.update(l => l - 1);
      if (this.lives() <= 0) this.isGameOver.set(true);
      
      setTimeout(() => arrow.isWrong = false, 400);
    }
  }

  private animateClear(arrow: ArrowShape) {
    const start = performance.now();
    const duration = 900;
    const animate = (time: number) => {
      const p = (time - start) / duration;
      arrow.exitProgress = Math.min(p, 1);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  private canMoveOut(arrow: ArrowShape): boolean {
    let r = arrow.cells[0].r;
    let c = arrow.cells[0].c;
    while (true) {
      switch (arrow.direction) {
        case ArrowDirection.UP: r--; break;
        case ArrowDirection.DOWN: r++; break;
        case ArrowDirection.LEFT: c--; break;
        case ArrowDirection.RIGHT: c++; break;
      }
      if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return true;
      if (this.arrows.some(a => !a.isCleared && a.id !== arrow.id && a.cells.some(cell => cell.r === r && cell.c === c))) return false;
    }
  }

  private generateLevel(rows: number, cols: number, level: number): ArrowShape[] {
    const arrows: ArrowShape[] = [];
    const occupied = Array.from({ length: rows }, () => Array(cols).fill(false));
    let id = 0;
    const targetSnakes = Math.min(8 + level * 2, 45);
    let fails = 0;
    const exitLanes: { r: number, c: number }[] = [];

    while (arrows.length < targetSnakes && fails < 1500) {
      let hr, hc;
      if (exitLanes.length > 0 && Math.random() < 0.6) {
        const cell = exitLanes[Math.floor(Math.random() * exitLanes.length)];
        hr = cell.r; hc = cell.c;
      } else {
        hr = Math.floor(Math.random() * rows);
        hc = Math.floor(Math.random() * cols);
      }

      if (occupied[hr][hc]) { fails++; continue; }

      const dir = [ArrowDirection.UP, ArrowDirection.RIGHT, ArrowDirection.DOWN, ArrowDirection.LEFT][Math.floor(Math.random() * 4)];
      
      let pr = hr, pc = hc, blocked = false;
      while (true) {
        switch (dir) {
          case ArrowDirection.UP: pr--; break;
          case ArrowDirection.DOWN: pr++; break;
          case ArrowDirection.LEFT: pc--; break;
          case ArrowDirection.RIGHT: pc++; break;
        }
        if (pr < 0 || pr >= rows || pc < 0 || pc >= cols) break;
        if (occupied[pr][pc]) { blocked = true; break; }
      }

      if (blocked) { fails++; continue; }

      const maxLen = Math.min(Math.max(2 + Math.floor(level / 2), 3), 8);
      const len = 2 + Math.floor(Math.random() * (maxLen - 1));
      const body = [{ r: hr, c: hc }];
      const visited = new Set([`${hr},${hc}`]);
      
      let dr = dir === ArrowDirection.UP ? 1 : dir === ArrowDirection.DOWN ? -1 : 0;
      let dc = dir === ArrowDirection.LEFT ? 1 : dir === ArrowDirection.RIGHT ? -1 : 0;
      let cr = hr, cc = hc;
      let turns = 1 + Math.floor(level / 3);

      for (let i = 1; i < len; i++) {
        if (i > 1 && turns > 0 && Math.random() < 0.45) {
          const perps = dr !== 0 ? [{ r: 0, c: 1 }, { r: 0, c: -1 }] : [{ r: 1, c: 0 }, { r: -1, c: 0 }];
          const valid = perps.filter(p => {
            const nr = cr + p.r, nc = cc + p.c;
            return nr >= 0 && nr < rows && nc >= 0 && nc < cols && !occupied[nr][nc] && !visited.has(`${nr},${nc}`);
          });
          if (valid.length > 0) {
            const chosen = valid[Math.floor(Math.random() * valid.length)];
            dr = chosen.r; dc = chosen.c;
            turns--;
          }
        }
        const nr = cr + dr, nc = cc + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || occupied[nr][nr] || visited.has(`${nr},${nc}`)) break;
        body.push({ r: nr, c: nc });
        visited.add(`${nr},${nc}`);
        cr = nr; cc = nc;
      }

      if (body.length < 2) { fails++; continue; }

      body.forEach(b => occupied[b.r][b.c] = true);
      const arrow: ArrowShape = {
        id: id++, cells: body, direction: dir, isCleared: false, isWrong: false,
        exitProgress: 0, wrongFlash: 0, color: this.snakeColors[id % this.snakeColors.length]
      };
      arrows.push(arrow);
      
      let er = hr, ec = hc;
      while (true) {
        switch (dir) {
          case ArrowDirection.UP: er--; break;
          case ArrowDirection.DOWN: er++; break;
          case ArrowDirection.LEFT: ec--; break;
          case ArrowDirection.RIGHT: ec++; break;
        }
        if (er < 0 || er >= rows || ec < 0 || ec >= cols) break;
        exitLanes.push({ r: er, c: ec });
      }
      fails = 0;
    }
    return arrows.sort(() => Math.random() - 0.5);
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    
    // Draw dots
    this.ctx.fillStyle = '#2a2a3a';
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.ctx.beginPath();
        this.ctx.arc(
          this.startX + c * this.cellSize + this.cellSize / 2,
          this.startY + r * this.cellSize + this.cellSize / 2,
          1.5 * window.devicePixelRatio, 0, Math.PI * 2
        );
        this.ctx.fill();
      }
    }

    // Draw arrows
    this.arrows.forEach(arrow => {
      if (arrow.exitProgress >= 1) return;
      this.drawArrow(arrow);
    });

    this.animationFrameId = requestAnimationFrame(() => this.render());
  }

  private drawArrow(arrow: ArrowShape) {
    const ctx = this.ctx;
    const points = arrow.cells.map(c => ({
      x: this.startX + c.c * this.cellSize + this.cellSize / 2,
      y: this.startY + c.r * this.cellSize + this.cellSize / 2
    }));

    if (points.length < 2) return;

    // Path calculation
    const head = points[0];
    const extLen = 3000;
    let extEnd = { x: head.x, y: head.y };
    switch (arrow.direction) {
      case ArrowDirection.UP: extEnd.y -= extLen; break;
      case ArrowDirection.DOWN: extEnd.y += extLen; break;
      case ArrowDirection.LEFT: extEnd.x -= extLen; break;
      case ArrowDirection.RIGHT: extEnd.x += extLen; break;
    }

    const fullPath = [...points.reverse(), extEnd];
    const snakeLen = (arrow.cells.length - 1) * this.cellSize;
    
    // Simple segment drawing for efficiency
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const color = arrow.isWrong ? '#FF4B5C' : arrow.color;
    const alpha = arrow.isCleared ? 0.6 : 0.95;

    // Draw snake body
    ctx.strokeStyle = color;
    ctx.lineWidth = this.cellSize * 0.18;
    ctx.globalAlpha = alpha;
    
    // Actually we need to calculate the segment based on exitProgress
    // For now, let's simplify the sliding animation
    const totalDist = 0; // Not really used this way in canvas usually
    
    // Re-calculating points for segment
    const revPoints = [...arrow.cells].reverse().map(c => ({
      x: this.startX + c.c * this.cellSize + this.cellSize / 2,
      y: this.startY + c.r * this.cellSize + this.cellSize / 2
    }));
    revPoints.push(extEnd);

    // This is a complex path measure in JS, I'll approximate it
    const progress = arrow.exitProgress;
    const offset = progress * snakeLen * 5; // move fast

    ctx.beginPath();
    let first = true;
    revPoints.forEach((p, i) => {
      // In a real path measure we'd find the segment. 
      // Approximating: shift the whole path
      let dx = 0, dy = 0;
      switch (arrow.direction) {
        case ArrowDirection.UP: dy -= offset; break;
        case ArrowDirection.DOWN: dy += offset; break;
        case ArrowDirection.LEFT: dx -= offset; break;
        case ArrowDirection.RIGHT: dx += offset; break;
      }
      if (first) { ctx.moveTo(p.x + dx, p.y + dy); first = false; }
      else ctx.lineTo(p.x + dx, p.y + dy);
    });
    
    // Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Arrowhead
    const headPos = { x: head.x, y: head.y };
    let dx = 0, dy = 0;
    switch (arrow.direction) {
      case ArrowDirection.UP: dy -= offset; break;
      case ArrowDirection.DOWN: dy += offset; break;
      case ArrowDirection.LEFT: dx -= offset; break;
      case ArrowDirection.RIGHT: dx += offset; break;
    }
    this.drawArrowHead(headPos.x + dx, headPos.y + dy, arrow.direction, this.cellSize * 0.28, color);
    
    ctx.globalAlpha = 1;
  }

  private drawArrowHead(x: number, y: number, dir: ArrowDirection, size: number, color: string) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = this.cellSize * 0.18;
    const s = size;
    switch (dir) {
      case ArrowDirection.UP:
        ctx.moveTo(x - s, y + s * 0.6);
        ctx.lineTo(x, y - s);
        ctx.lineTo(x + s, y + s * 0.6);
        break;
      case ArrowDirection.DOWN:
        ctx.moveTo(x - s, y - s * 0.6);
        ctx.lineTo(x, y + s);
        ctx.lineTo(x + s, y - s * 0.6);
        break;
      case ArrowDirection.LEFT:
        ctx.moveTo(x + s * 0.6, y - s);
        ctx.lineTo(x - s, y);
        ctx.lineTo(x + s * 0.6, y + s);
        break;
      case ArrowDirection.RIGHT:
        ctx.moveTo(x - s * 0.6, y - s);
        ctx.lineTo(x + s, y);
        ctx.lineTo(x - s * 0.6, y + s);
        break;
    }
    ctx.stroke();
  }

  nextLevel() {
    this.startNewGame(this.level() + 1);
  }

  restart() {
    this.startNewGame(1);
  }

  exit() {
    this.router.navigate(['/dashboard/games']);
  }

  ngOnDestroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }
}
