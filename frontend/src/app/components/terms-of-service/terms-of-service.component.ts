import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
    selector: 'app-terms-of-service',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe],
    templateUrl: './terms-of-service.component.html',
    styleUrl: './terms-of-service.component.css'
})
export class TermsOfServiceComponent implements OnInit {
    public languageService = inject(LanguageService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);
    private location = inject(Location);

    activeSection = 'section-0';

    goBack() {
        this.location.back();
    }

    sections = [
        {
            title: 'terms.acceptance_title',
            content: 'terms.acceptance_desc'
        },
        {
            title: 'terms.eligibility_title',
            content: 'terms.eligibility_desc'
        },
        {
            title: 'terms.registration_title',
            content: 'terms.registration_desc'
        },
        {
            title: 'terms.user_conduct_title',
            content: 'terms.user_conduct_desc'
        },
        {
            title: 'terms.content_ownership_title',
            content: 'terms.content_ownership_desc'
        },
        {
            title: 'terms.termination_title',
            content: 'terms.termination_desc'
        },
        {
            title: 'terms.disclaimers_title',
            content: 'terms.disclaimers_desc'
        },
        {
            title: 'terms.governing_law_title',
            content: 'terms.governing_law_desc'
        }
    ];

    constructor() {
        effect(() => {
            // Establish dependency on language changes to re-evaluate and mark for check
            this.languageService.currentLang();
            this.cdr.markForCheck();
        });
    }

    ngOnInit() {
        this.setupScrollObserver();
    }

    scrollToSection(id: string) {
        const element = document.getElementById(id);
        if (element) {
            // Subtract offset for navbar spacing
            const offset = 90;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            this.activeSection = id;
        }
    }

    private setupScrollObserver() {
        if (!isPlatformBrowser(this.platformId)) return;
        if (!('IntersectionObserver' in window)) return;

        // 1. Observer for Scroll-in animations
        const fadeObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            { threshold: 0.1 }
        );

        // 2. Observer for active Sidebar TOC linking
        const sectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        this.activeSection = entry.target.id;
                        this.cdr.markForCheck();
                    }
                });
            },
            { threshold: 0.2, rootMargin: '-10% 0px -70% 0px' }
        );

        setTimeout(() => {
            document.querySelectorAll('.animate-on-scroll').forEach((el) => {
                fadeObserver.observe(el);
            });

            // Track active section to highlight TOC sidebar link
            for (let i = 0; i < this.sections.length; i++) {
                const el = document.getElementById(`section-${i}`);
                if (el) sectionObserver.observe(el);
            }
        }, 150);
    }
}
