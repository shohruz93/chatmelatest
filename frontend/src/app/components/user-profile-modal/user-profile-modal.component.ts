import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
    selector: 'app-user-profile-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './user-profile-modal.component.html',
    styleUrls: ['./user-profile-modal.component.css']
})
export class UserProfileModalComponent {
    @Input() user: any;
    @Output() closeEvent = new EventEmitter<void>();

    private router = inject(Router);

    languageOptions = [
        { value: 'any', label: 'Any Language' },
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'ru', label: 'Russian' },
        { value: 'zh', label: 'Chinese' },
        { value: 'ja', label: 'Japanese' },
        { value: 'ko', label: 'Korean' },
        { value: 'ar', label: 'Arabic' },
        { value: 'pt', label: 'Portuguese' },
        { value: 'hi', label: 'Hindi' },
        { value: 'tg', label: 'Tajik' },
        { value: 'tr', label: 'Turkish' },
        { value: 'it', label: 'Italian' }
    ];

    locationOptions = [
        { value: 'any', label: 'Any Location' },
        { value: 'US', label: 'United States' },
        { value: 'GB', label: 'United Kingdom' },
        { value: 'RU', label: 'Russia' },
        { value: 'TJ', label: 'Tajikistan' },
        { value: 'DE', label: 'Germany' },
        { value: 'FR', label: 'France' },
        { value: 'TR', label: 'Turkey' },
        { value: 'CN', label: 'China' },
        { value: 'JP', label: 'Japan' },
        { value: 'KR', label: 'South Korea' },
        { value: 'IN', label: 'India' },
        { value: 'BR', label: 'Brazil' },
        { value: 'MX', label: 'Mexico' },
        { value: 'ES', label: 'Spain' },
        { value: 'IT', label: 'Italy' },
        { value: 'CA', label: 'Canada' },
        { value: 'AU', label: 'Australia' }
    ];

    close() {
        this.closeEvent.emit();
    }

    sendMessage() {
        this.router.navigate(['/chat', this.user.id]);
        this.close();
    }

    getLanguageLabel(code: string): string {
        const lang = this.languageOptions.find(l => l.value === code);
        return lang ? lang.label : code;
    }

    getLocationLabel(code: string): string {
        const loc = this.locationOptions.find(l => l.value === code);
        return loc ? loc.label : code;
    }

    // Map country names to ISO 2-letter codes
    private countryNameToCode: { [key: string]: string } = {
        'united states': 'us', 'united kingdom': 'gb', 'russia': 'ru', 'tajikistan': 'tj',
        'germany': 'de', 'france': 'fr', 'turkey': 'tr', 'china': 'cn', 'japan': 'jp',
        'south korea': 'kr', 'korea': 'kr', 'india': 'in', 'brazil': 'br', 'mexico': 'mx',
        'spain': 'es', 'italy': 'it', 'canada': 'ca', 'australia': 'au', 'switzerland': 'ch',
        'netherlands': 'nl', 'belgium': 'be', 'sweden': 'se', 'norway': 'no', 'denmark': 'dk',
        'finland': 'fi', 'poland': 'pl', 'portugal': 'pt', 'greece': 'gr', 'austria': 'at',
        'czech republic': 'cz', 'ireland': 'ie', 'new zealand': 'nz', 'singapore': 'sg',
        'malaysia': 'my', 'thailand': 'th', 'vietnam': 'vn', 'philippines': 'ph',
        'indonesia': 'id', 'pakistan': 'pk', 'bangladesh': 'bd', 'egypt': 'eg',
        'south africa': 'za', 'nigeria': 'ng', 'kenya': 'ke', 'argentina': 'ar',
        'chile': 'cl', 'colombia': 'co', 'peru': 'pe', 'venezuela': 've', 'ukraine': 'ua',
        'romania': 'ro', 'hungary': 'hu', 'israel': 'il', 'saudi arabia': 'sa',
        'uae': 'ae', 'united arab emirates': 'ae'
    };

    getFlagIcon(location: string): string {
        if (!location) return '';

        const locationLower = location.toLowerCase().trim();

        // Check if it's already a 2-letter code
        if (locationLower.length === 2) {
            return `/flags/${locationLower}.png`;
        }

        // Try to map country name to code
        const code = this.countryNameToCode[locationLower];
        if (code) {
            return `/flags/${code}.png`;
        }

        // Fallback
        return `/flags/${locationLower}.png`;
    }

    getAvatarColor(name: string): string {
        const colors = [
            'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)',
            'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
            'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
            'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)'
        ];

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    getInitials(name: string): string {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    getLanguageArray(languages: string | string[]): string[] {
        if (!languages) return [];
        return Array.isArray(languages) ? languages : [languages];
    }
}
