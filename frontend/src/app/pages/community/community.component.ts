import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunityFeedComponent } from '../../components/community-feed/community-feed.component';
import { LanguageGameComponent } from '../../components/language-game/language-game.component';
import { AdsterraBannerComponent } from '../../components/adsterra-banner/adsterra-banner.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, CommunityFeedComponent, LanguageGameComponent, TranslatePipe, AdsterraBannerComponent],
  template: `
    <div class="community-page-container relative">
      <header class="page-header flex justify-between items-center">
        <h2>{{ 'NAV.COMMUNITY' | translate }}</h2>
        <button (click)="showLanguageGame = true" class="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all duration-300 shadow-sm border border-blue-500/20 active:scale-95 group" title="Play Language Game">
          <!-- Gamepad Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" class="group-hover:animate-pulse" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="6" y1="12" x2="10" y2="12"></line>
            <line x1="8" y1="10" x2="8" y2="14"></line>
            <line x1="15" y1="13" x2="15.01" y2="13"></line>
            <line x1="18" y1="11" x2="18.01" y2="11"></line>
            <rect x="2" y="6" width="20" height="12" rx="2"></rect>
          </svg>
        </button>
      </header>

      <div class="hidden md:flex justify-center my-4 w-full">
        <app-adsterra-banner key="8342fca62e8c8234f4a70eb5ef1d0784" [width]="728" [height]="90"></app-adsterra-banner>
      </div>
      <div class="flex md:hidden justify-center my-4 w-full">
        <app-adsterra-banner key="dbce7f5203c055b563c8ee393acb030e" [width]="320" [height]="50"></app-adsterra-banner>
      </div>

      <app-community-feed></app-community-feed>
      
      <app-language-game *ngIf="showLanguageGame" (close)="showLanguageGame = false"></app-language-game>
    </div>
  `,
  styles: [`
    .community-page-container {
      padding: 0;
      height: 100%;
      overflow-y: auto;
      background: var(--bg-primary, #ffffff);
    }
    .page-header {
      padding: 1.5rem 2rem 0.5rem;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 1rem;
    }
    .page-header h2 {
      margin: 0;
      font-size: 1.8rem;
      color: var(--text-primary);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommunityComponent {
  showLanguageGame = false;
}

