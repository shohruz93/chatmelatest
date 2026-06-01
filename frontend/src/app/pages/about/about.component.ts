import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
    selector: 'app-about',
    standalone: true,
    imports: [RouterModule, CommonModule, TranslatePipe],
    templateUrl: './about.component.html',
    styleUrl: './about.component.css'
})
export class AboutComponent implements OnInit {
    public languageService = inject(LanguageService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);

    constructor() {
        effect(() => {
            // Re-evaluate on language change
            this.languageService.currentLang();
            this.cdr.markForCheck();
        });
    }

    ngOnInit() {
        this.setupScrollObserver();
    }

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
            { threshold: 0.1 }
        );

        setTimeout(() => {
            document.querySelectorAll('.animate-on-scroll').forEach((el) => {
                observer.observe(el);
            });
        }, 150);
    }
}
