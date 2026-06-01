import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  effect,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Capacitor } from '@capacitor/core';
import { AppVersionService } from '../../services/app-version.service';
import { HomeService, PublicStats } from '../../services/home.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, CommonModule, HeaderComponent, TranslatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private appVersionService = inject(AppVersionService);
  private homeService = inject(HomeService);
  private languageService = inject(LanguageService);
  private cdr = inject(ChangeDetectorRef);

  isWeb = true;
  downloadUrls: { android: string | null; ios: string | null } = {
    android: null,
    ios: null,
  };

  // Stats signals
  statsLoading = signal(true);
  statsError = signal(false);

  displayUsers = signal(0);
  displayOnline = signal(0);
  displayCountries = signal(0);
  displayMessages = signal(0);
  displayLanguages = signal(0);

  // Formatted display values (e.g. "52.4K+")
  formattedUsers = computed(() => this.formatNumber(this.displayUsers()));
  formattedOnline = computed(() => this.displayOnline().toLocaleString());
  formattedCountries = computed(() => this.displayCountries() + '+');
  formattedMessages = computed(() => this.formatNumber(this.displayMessages()));
  formattedLanguages = computed(() => this.displayLanguages() + '+');

  private animationFrames: number[] = [];

  constructor() {
    effect(() => {
      // Establish dependency on language changes to mark for check (triggers translation pipe updates)
      this.languageService.currentLang();
      this.cdr.markForCheck();
    });
  }

  ngOnInit() {
    try {
      this.isWeb = !Capacitor.isNativePlatform();
    } catch {
      this.isWeb = true;
    }

    if (this.isWeb) {
      this.downloadUrls.android =
        'https://play.google.com/store/apps/details?id=com.shohruz.chatme&pli=1';
      this.downloadUrls.ios = null;
    }

    this.loadStats();
    this.setupScrollObserver();
  }

  ngOnDestroy() {
    this.animationFrames.forEach((id) => cancelAnimationFrame(id));
  }

  private loadStats() {
    this.homeService.getPublicStats().subscribe({
      next: (data: PublicStats) => {
        this.statsLoading.set(false);
        this.animateCounter(this.displayUsers, data.totalUsers, 1800);
        this.animateCounter(this.displayOnline, data.onlineUsers, 1200);
        this.animateCounter(this.displayCountries, data.totalCountries, 1500);
        this.animateCounter(this.displayMessages, data.totalMessages, 2000);
        this.animateCounter(this.displayLanguages, data.totalLanguages, 1400);
        this.cdr.markForCheck();
        this.setupScrollObserver(); // Re-observe newly rendered stats cards in DOM
      },
      error: () => {
        this.statsLoading.set(false);
        this.statsError.set(true);
        // Animate with fallback values
        this.animateCounter(this.displayUsers, 50000, 1800);
        this.animateCounter(this.displayOnline, 0, 800);
        this.animateCounter(this.displayCountries, 100, 1500);
        this.animateCounter(this.displayMessages, 1000000, 2000);
        this.animateCounter(this.displayLanguages, 30, 1400);
        this.cdr.markForCheck();
        this.setupScrollObserver(); // Re-observe newly rendered fallback cards in DOM
      },
    });
  }

  /** Smooth count-up animation using requestAnimationFrame */
  private animateCounter(
    target: ReturnType<typeof signal<number>>,
    endValue: number,
    duration: number
  ) {
    if (!isPlatformBrowser(this.platformId) || endValue === 0) {
      target.set(endValue);
      return;
    }

    const startValue = 0;
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * eased);
      target.set(current);
      this.cdr.markForCheck();

      if (progress < 1) {
        const id = requestAnimationFrame(step);
        this.animationFrames.push(id);
      }
    };

    const id = requestAnimationFrame(step);
    this.animationFrames.push(id);
  }

  /** Format large numbers: 52400 → "52.4K", 1500000 → "1.5M" */
  private formatNumber(num: number): string {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M+';
    if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K+';
    return num.toString() + '+';
  }

  /** Intersection Observer for scroll-in animations */
  private setupScrollObserver() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15 }
    );

    // Observe after DOM is ready
    setTimeout(() => {
      document.querySelectorAll('.animate-on-scroll').forEach((el) => {
        observer.observe(el);
      });
    }, 100);
  }
}
