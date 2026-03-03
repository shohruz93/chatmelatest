import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
export class TermsOfServiceComponent {
    public languageService = inject(LanguageService);

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
}
