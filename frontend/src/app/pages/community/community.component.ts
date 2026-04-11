import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunityFeedComponent } from '../../components/community-feed/community-feed.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, CommunityFeedComponent, TranslatePipe],
  template: `
    <div class="community-page-container">
      <header class="page-header">
        <h2>{{ 'NAV.COMMUNITY' | translate }}</h2>
      </header>
      <app-community-feed></app-community-feed>
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
export class CommunityComponent {}
