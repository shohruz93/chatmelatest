import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CountryService } from '../../services/country.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-user-profile-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe],
    templateUrl: './user-profile-modal.component.html',
    styleUrls: ['./user-profile-modal.component.css']
})
export class UserProfileModalComponent implements OnInit {
    @Input() user: any;
    @Output() closeEvent = new EventEmitter<void>();

    private router = inject(Router);
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private countryService = inject(CountryService);

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

    // Simplified location and language display methods using CountryService
    getFlagIcon(location: string): string {
        return this.countryService.getFlagUrl(location);
    }

    getLocationLabel(location: string): string {
        return this.countryService.getCountryName(location);
    }

    getLanguageLabel(code: string): string {
        return this.countryService.getLanguageName(code);
    }

    getLanguageFlagUrl(code: string): string {
        return this.countryService.getLanguageFlagUrl(code);
    }

    getLanguageArray(lang: string | string[]): string[] {
        if (!lang) return [];
        return Array.isArray(lang) ? lang : lang.split(',').map(s => s.trim());
    }

    close() {
        this.closeEvent.emit();
    }

    sendMessage() {
        this.router.navigate(['dashboard/chat', this.user.id]);
        this.close();
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
                this.comments = this.comments.map(comment => {
                    if (comment.rater_avatar && !comment.rater_avatar.startsWith('http')) {
                        comment.rater_avatar = `${this.api.phpBaseUrl}${comment.rater_avatar}`;
                    }
                    if (comment.replies) {
                        comment.replies = comment.replies.map((reply: any) => {
                            if (reply.replier_avatar && !reply.replier_avatar.startsWith('http')) {
                                reply.replier_avatar = `${this.api.phpBaseUrl}${reply.replier_avatar}`;
                            }
                            return reply;
                        });
                    }
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

    getLastOnlineText(lastActive: string | number | undefined): string {
        if (!lastActive) return '';

        let ts: number;
        if (typeof lastActive === 'number') {
            ts = lastActive * 1000;
        } else if (/^\d+$/.test(String(lastActive))) {
            ts = parseInt(String(lastActive), 10) * 1000;
        } else {
            ts = new Date(String(lastActive)).getTime();
        }

        const lastActiveDate = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - lastActiveDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) {
            return 'just now';
        } else if (diffMins < 60) {
            return `${diffMins} min ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else {
            return lastActiveDate.toLocaleDateString();
        }
    }
}
