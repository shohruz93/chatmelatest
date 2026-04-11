import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunityFeedComponent } from '../../components/community-feed/community-feed.component';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, CommunityFeedComponent],
  template: `
    <div class="community-page-container">
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommunityComponent {}
