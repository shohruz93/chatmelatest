import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
    selector: 'app-privacy-policy',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe],
    templateUrl: './privacy-policy.component.html',
    styleUrl: './privacy-policy.component.css'
})
export class PrivacyPolicyComponent implements OnInit {
    public languageService = inject(LanguageService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);

    activeSection = 'section-0';

    sections = [
        {
            title: 'privacy.title',
            content: 'privacy.intro'
        },
        {
            title: 'privacy.data_collection',
            content: 'privacy.data_collection_desc'
        },
        {
            title: 'privacy.data_usage',
            content: 'privacy.data_usage_desc'
        },
        {
            title: 'privacy.data_protection',
            content: 'privacy.data_protection_desc'
        },
        {
            title: 'privacy.children_privacy',
            content: 'privacy.children_privacy_desc'
        },
        {
            title: 'privacy.user_rights',
            content: 'privacy.user_rights_desc'
        },
        {
            title: 'privacy.contact',
            content: 'privacy.contact_desc'
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
            const notice = document.getElementById('important-notice');
            if (notice) sectionObserver.observe(notice);
            const contact = document.getElementById('contact-section');
            if (contact) sectionObserver.observe(contact);
        }, 150);
    }
}
