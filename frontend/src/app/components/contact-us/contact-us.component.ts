import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
    selector: 'app-contact-us',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe],
    templateUrl: './contact-us.component.html',
    styleUrl: './contact-us.component.css'
})
export class ContactUsComponent implements OnInit {
    public languageService = inject(LanguageService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);
    private location = inject(Location);

    goBack() {
        this.location.back();
    }

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
