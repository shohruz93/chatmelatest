import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { UnixDatePipe } from '../../pipes/unix-date.pipe';

@Component({
    selector: 'app-all-comments',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, UnixDatePipe],
    templateUrl: './all-comments.component.html',
    styleUrl: './all-comments.component.css'
})
export class AllCommentsComponent implements OnInit {
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private route = inject(ActivatedRoute);

    currentUser: any;
    profileUser: any;
    comments: any[] = [];
    loading = true;
    userId: number = 0;

    showReplyInput: { [key: number]: boolean } = {};
    showReplies: { [key: number]: boolean } = {};
    replyContent: { [key: number]: string } = {};

    ngOnInit() {
        this.currentUser = this.auth.currentUserValue;
        this.route.params.subscribe(params => {
            this.userId = +params['id'];
            if (this.userId) {
                this.loadProfile();
                this.loadComments();
            }
        });
    }

    loadProfile() {
        this.api.get(`/profile?userId=${this.userId}`).subscribe({
            next: (data) => {
                this.profileUser = data;
            },
            error: (err) => console.error('Error loading profile', err)
        });
    }

    loadComments() {
        this.loading = false;
        this.comments = [];
    }

    toggleReply(commentId: number) {
        this.showReplyInput[commentId] = !this.showReplyInput[commentId];
    }

    toggleReplies(commentId: number) {
        this.showReplies[commentId] = !this.showReplies[commentId];
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
}
