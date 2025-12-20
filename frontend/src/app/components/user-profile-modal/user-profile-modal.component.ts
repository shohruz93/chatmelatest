import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-user-profile-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './user-profile-modal.component.html',
    styleUrls: ['./user-profile-modal.component.css']
})
export class UserProfileModalComponent implements OnInit {
    @Input() user: any;
    @Output() closeEvent = new EventEmitter<void>();

    private router = inject(Router);
    private api = inject(ApiService);
    private auth = inject(AuthService);

    currentUser: any;
    ratings: any = { average: 0, count: 0 };
    comments: any[] = [];
    newRating: number = 0;
    newComment: string = '';
    hasRated: boolean = false;
    userRating: any = null;
    replyContent: { [key: number]: string } = {};
    showReplyInput: { [key: number]: boolean } = {};
    showReplies: { [key: number]: boolean } = {};

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
        { value: 'tj', label: 'Tajik' },
        { value: 'tr', label: 'Turkish' },
        { value: 'it', label: 'Italian' },
        { value: 'fa', label: 'Persian' },
        { value: 'tg', label: 'Tajik' },
        { value: 'he', label: 'Hebrew' },
        { value: 'cs', label: 'Czech' },
        { value: 'ro', label: 'Romanian' },
        { value: 'hu', label: 'Hungarian' },
        { value: 'el', label: 'Greek' },
        { value: 'hr', label: 'Croatian' },
        { value: 'sr', label: 'Serbian' },
        { value: 'sl', label: 'Slovenian' },
        { value: 'lt', label: 'Lithuanian' },
        { value: 'lv', label: 'Latvian' },
        { value: 'et', label: 'Estonian' },
        { value: 'ka', label: 'Georgian' },
        { value: 'hy', label: 'Armenian' },
        { value: 'az', label: 'Azerbaijani' },
        { value: 'kk', label: 'Kazakh' },
        { value: 'uz', label: 'Uzbek' },
        { value: 'ky', label: 'Kyrgyz' }

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
        { value: 'AU', label: 'Australia' },
        { value: 'CH', label: 'Switzerland' },
        { value: 'NL', label: 'Netherlands' },
        { value: 'BE', label: 'Belgium' },
        { value: 'SE', label: 'Sweden' },
        { value: 'NO', label: 'Norway' },
        { value: 'DK', label: 'Denmark' },
        { value: 'FI', label: 'Finland' },
        { value: 'PL', label: 'Poland' },
        { value: 'PT', label: 'Portugal' },
        { value: 'GR', label: 'Greece' },
        { value: 'AT', label: 'Austria' },
        { value: 'CZ', label: 'Czech Republic' },
        { value: 'IE', label: 'Ireland' },
        { value: 'NZ', label: 'New Zealand' },
        { value: 'SG', label: 'Singapore' },
        { value: 'MY', label: 'Malaysia' },
        { value: 'TH', label: 'Thailand' },
        { value: 'VN', label: 'Vietnam' },
        { value: 'PH', label: 'Philippines' },
        { value: 'ID', label: 'Indonesia' },
        { value: 'PK', label: 'Pakistan' },
        { value: 'BD', label: 'Bangladesh' },
        { value: 'EG', label: 'Egypt' },
        { value: 'ZA', label: 'South Africa' },
        { value: 'NG', label: 'Nigeria' },
        { value: 'KE', label: 'Kenya' },
        { value: 'AR', label: 'Argentina' },
        { value: 'CL', label: 'Chile' },
        { value: 'CO', label: 'Colombia' },
        { value: 'PE', label: 'Peru' },
        { value: 'VE', label: 'Venezuela' },
        { value: 'UA', label: 'Ukraine' },
        { value: 'RO', label: 'Romania' },
        { value: 'HU', label: 'Hungary' },
        { value: 'IL', label: 'Israel' },
        { value: 'SA', label: 'Saudi Arabia' },
        { value: 'AE', label: 'United Arab Emirates' },
        { value: 'IR', label: 'Iran' },
        { value: 'IQ', label: 'Iraq' },
        { value: 'SY', label: 'Syria' },
        { value: 'LB', label: 'Lebanon' },
        { value: 'JO', label: 'Jordan' },
        { value: 'MA', label: 'Morocco' },
        { value: 'TN', label: 'Tunisia' },
        { value: 'DZ', label: 'Algeria' }
    ];

    close() {
        this.closeEvent.emit();
    }

    sendMessage() {
        this.router.navigate(['dashboard/chat', this.user.id]);
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
        'united states': 'us',
        'united kingdom': 'gb',
        'russia': 'ru',
        'tajikistan': 'tj',
        'germany': 'de',
        'france': 'fr',
        'turkey': 'tr',
        'china': 'cn',
        'japan': 'jp',
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
        'uae': 'ae', 'united arab emirates': 'ae', 'iran': 'ir', 'iraq': 'iq', 'syria': 'sy',
        'lebanon': 'lb', 'jordan': 'jo', 'morocco': 'ma', 'tunisia': 'tn', 'algeria': 'dz'
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

    // Map language codes to country codes for flags
    private languageToCountry: { [key: string]: string } = {
        'en': 'gb',
        'es': 'es',
        'fr': 'fr',
        'de': 'de',
        'ru': 'ru',
        'zh': 'cn',
        'ja': 'jp',
        'ko': 'kr',
        'ar': 'sa',
        'pt': 'pt',
        'hi': 'in',
        'tg': 'tj',
        'tr': 'tr',
        'it': 'it',
        'fa': 'ir'
    };

    getLanguageFlagUrl(langCode: string): string {
        if (!langCode) return '';
        const countryCode = this.languageToCountry[langCode.toLowerCase()] || langCode.toLowerCase();
        return `/flags/${countryCode}.png`;
    }

    ngOnInit() {
        this.currentUser = this.auth.currentUserValue;
        if (this.user && this.user.id) {
            // Record profile view if viewing another user's profile
            if (this.currentUser && this.currentUser.id !== this.user.id) {
                this.api.recordView(this.currentUser.id, this.user.id).subscribe({
                    next: () => { },
                    error: () => { }
                });
            }

            this.loadRatingsAndComments();
        }
    }

    loadRatingsAndComments() {
        // Load user's rating stats
        this.api.get(`/profile?userId=${this.user.id}`).subscribe({
            next: (data) => {
                this.ratings = {
                    average: data.rating || 0,
                    count: data.rating_count || 0
                };
            },
            error: (err) => console.error('Error loading ratings', err)
        });

        // Load comments
        this.loadComments();
    }

    loadComments() {
        this.api.getComments(this.user.id).subscribe({
            next: (data) => {
                this.comments = data;
                this.comments.map(comment => {
                    comment.rater_avatar = `${this.api.phpBaseUrl}${comment.rater_avatar}`;
                    comment.replies?.map((reply: any) => {
                        reply.replier_avatar = `${this.api.phpBaseUrl}${reply.replier_avatar}`;
                        return reply;
                    });
                    return comment;
                });


                // Check if current user has already rated
                if (this.currentUser) {
                    this.userRating = this.comments.find(
                        c => c.rater_id === this.currentUser.id && c.rating !== null && c.rating > 0
                    );
                    this.hasRated = !!this.userRating;
                }
            },
            error: (err) => console.error('Error loading comments', err)
        });
    }

    setRating(stars: number) {
        this.newRating = stars;
    }

    submitRating() {
        if (this.newRating === 0) {
            alert('Please select a rating');
            return;
        }

        const data = {
            raterId: this.currentUser.id,
            ratedId: this.user.id,
            rating: this.newRating,
            comment: this.newComment
        };

        this.api.post('/profile/rating', data).subscribe({
            next: () => {
                this.newRating = 0;
                this.newComment = '';
                this.loadRatingsAndComments();
            },
            error: (err) => alert('Failed to submit rating')
        });
    }

    submitComment() {
        if (!this.newComment.trim()) {
            alert('Please enter a comment');
            return;
        }

        this.api.addComment(this.currentUser.id, this.user.id, this.newComment).subscribe({
            next: () => {
                this.newComment = '';
                this.loadComments();
            },
            error: (err) => alert('Failed to submit comment')
        });
    }

    toggleReply(commentId: number, event?: Event) {
        if (event) {
            event.stopPropagation();
        }

        // If closing the reply input, clear the content
        if (this.showReplyInput[commentId]) {
            this.replyContent[commentId] = '';
        }

        this.showReplyInput[commentId] = !this.showReplyInput[commentId];
    }

    submitReply(commentId: number) {
        const content = this.replyContent[commentId];
        if (!content?.trim()) return;

        this.api.addReply(commentId, this.currentUser.id, content).subscribe({
            next: () => {
                this.replyContent[commentId] = '';
                this.showReplyInput[commentId] = false;
                this.loadComments();
            },
            error: (err) => alert('Failed to reply')
        });
    }

    likeComment(commentId: number, type: 'like' | 'dislike') {
        this.api.likeComment(commentId, this.currentUser.id, type).subscribe({
            next: () => {
                this.loadComments();
            },
            error: (err) => console.error('Failed to like/dislike', err)
        });
    }

    toggleRepliesVisibility(commentId: number) {
        this.showReplies[commentId] = !this.showReplies[commentId];
    }
}
