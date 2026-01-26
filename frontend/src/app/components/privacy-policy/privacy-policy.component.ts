import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
export class PrivacyPolicyComponent {
    public languageService = inject(LanguageService);

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
}
