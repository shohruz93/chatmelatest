import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CommunityService, CommunityPost, CommunityComment } from '../../services/community.service';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { LanguageService } from '../../services/language.service';
import { CommunityStorageService } from '../../services/community-storage.service';
import { environment } from '../../../environments/environment';


@Component({
    selector: 'app-community-feed',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
    templateUrl: './community-feed.component.html',
    styleUrls: ['./community-feed.component.css']
})
export class CommunityFeedComponent implements OnInit {
    private communityService = inject(CommunityService);
    private auth = inject(AuthService);
    private translationService = inject(TranslationService);
    public languageService = inject(LanguageService);
    private communityStorage = inject(CommunityStorageService);

    currentUser = this.auth.currentUserValue;
    posts = signal<CommunityPost[]>([]);
    loading = signal(false);
    showCreateModal = signal(false);
    showCommentsModal = signal(false);
    selectedPost: CommunityPost | null = null;
    allComments: CommunityComment[] = [];

    // Create post form
    postType: 'text' | 'image' | 'video' = 'text';
    postText: string = '';
    postFile: File | null = null;
    postPreview: string | null = null;
    videoDuration: number = 0;
    uploadProgress = signal(false);
    uploadPercent = signal(0);

    // Filter Signals
    sortBy = signal<'newest' | 'likes' | 'comments' | 'views'>('newest');
    timeRange = signal<'all' | 'day' | 'week' | 'month'>('all');

    // Pagination
    page = signal(1);
    hasMore = signal(true);
    isLoadingMore = signal(false);

    private apiUrl = environment.phpBaseUrl;

    // Double tap constraints
    private lastTap: number = 0;
    private readonly DOUBLE_TAP_DELAY = 300;

    ngOnInit() {
        if (this.currentUser?.id) {
            this.communityStorage.openDb(this.currentUser.id).then(() => {
                this.loadLocalFeed();
                this.loadFeed(true);
            });
        }
    }

    loadLocalFeed() {
        this.communityStorage.getPosts().then(posts => {
            if (posts.length > 0 && this.posts().length === 0) {
                this.posts.set(posts);
            }
        });
    }

    loadFeed(reset: boolean = false) {
        if (this.loading() || (this.isLoadingMore() && !reset)) return;

        if (reset) {
            this.page.set(1);
            this.hasMore.set(true);
            this.loading.set(true);
        } else {
            this.isLoadingMore.set(true);
        }

        this.communityService.getFeed(
            this.currentUser?.id,
            this.page(),
            10,
            this.sortBy(),
            this.timeRange()
        ).subscribe({
            next: (newPosts) => {
                if (newPosts.length < 10) {
                    this.hasMore.set(false);
                }

                if (reset) {
                    this.posts.set(newPosts);
                } else {
                    this.posts.update(current => [...current, ...newPosts]);
                }

                this.loading.set(false);
                this.isLoadingMore.set(false);

                if (reset) {
                    this.communityStorage.savePosts(newPosts);
                }
            },
            error: (err) => {
                console.error('Failed to load feed', err);
                this.loading.set(false);
                this.isLoadingMore.set(false);
            }
        });
    }

    onSortChange(sort: string) {
        this.sortBy.set(sort as any);
        this.loadFeed(true);
    }

    onTimeRangeChange(range: string) {
        this.timeRange.set(range as any);
        this.loadFeed(true);
    }

    onScroll(event: any) {
        const element = event.target;
        if (element.scrollHeight - element.scrollTop <= element.clientHeight + 100) {
            if (this.hasMore() && !this.isLoadingMore()) {
                this.page.update(p => p + 1);
                this.loadFeed();
            }
        }
    }

    handleDoubleTap(post: CommunityPost) {
        const now = Date.now();
        if (now - this.lastTap < this.DOUBLE_TAP_DELAY) {
            this.likePost(post);
            this.showHeartAnimation(post);
        }
        this.lastTap = now;

        // Also track view
        this.trackView(post);
    }

    trackView(post: CommunityPost) {
        // Debounce view tracking or check if already seen in session if needed
        // For now, just fire and forget
        this.communityService.viewPost(post.id).subscribe();
    }

    showHeartAnimation(post: CommunityPost) {
        const card = document.getElementById(`post-${post.id}`);
        if (card) {
            const heart = document.createElement('div');
            heart.classList.add('heart-animation');
            heart.innerHTML = '❤️';
            card.appendChild(heart);
            setTimeout(() => heart.remove(), 1000);
        }
    }

    openCreateModal() {
        this.showCreateModal.set(true);
        this.resetCreateForm();
    }

    closeCreateModal() {
        this.showCreateModal.set(false);
        this.resetCreateForm();
    }

    resetCreateForm() {
        this.postType = 'text';
        this.postText = '';
        this.postFile = null;
        this.postPreview = null;
        this.videoDuration = 0;
    }

    setPostType(type: 'text' | 'image' | 'video') {
        this.postType = type;
        this.postFile = null;
        this.postPreview = null;
        this.videoDuration = 0;
    }

    onFileSelect(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        if (this.postType === 'image' && file.type.startsWith('image/')) {
            this.postFile = file;
            const reader = new FileReader();
            reader.onload = (e: any) => this.postPreview = e.target.result;
            reader.readAsDataURL(file);
        } else if (this.postType === 'video' && file.type.startsWith('video/')) {
            // Check video duration
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                if (video.duration > 60) {
                    alert('Video must be 1 minute or less');
                    return;
                }
                this.videoDuration = Math.round(video.duration);
                this.postFile = file;
                this.postPreview = URL.createObjectURL(file);
            };
            video.src = URL.createObjectURL(file);
        }
    }

    createPost() {
        if (!this.currentUser?.id) return;

        this.uploadProgress.set(true);

        if (this.postType === 'text') {
            if (!this.postText.trim()) {
                alert('Please enter some text');
                this.uploadProgress.set(false);
                return;
            }
            this.communityService.createTextPost(this.currentUser.id, this.postText).subscribe({
                next: (res) => {
                    if (res.success && res.post) {
                        this.posts.update(posts => [res.post, ...posts]);
                        this.communityStorage.savePosts([res.post]);
                    }
                    this.closeCreateModal();
                    this.uploadProgress.set(false);
                },
                error: (err) => {
                    console.error('Failed to create post', err);
                    alert('Failed to create post');
                    this.uploadProgress.set(false);
                }
            });
        } else {
            if (!this.postFile) {
                alert('Please select a file');
                this.uploadProgress.set(false);
                return;
            }
            this.communityService.createMediaPost(
                this.currentUser.id,
                this.postFile,
                this.postType,
                this.postText,
                this.videoDuration
            ).subscribe({
                next: (event) => {
                    if (event.type === 'progress') {
                        this.uploadPercent.set(event.progress);
                    } else if (event.type === 'response') {
                        const res = event.body;
                        if (res.success && res.post) {
                            this.posts.update(posts => [res.post, ...posts]);
                            this.communityStorage.savePosts([res.post]);
                        }
                        this.closeCreateModal();
                        this.uploadProgress.set(false);
                        this.uploadPercent.set(0);
                    }
                },
                error: (err) => {
                    console.error('Failed to create post', err);
                    alert('Failed to create post');
                    this.uploadProgress.set(false);
                    this.uploadPercent.set(0);
                }
            });
        }
    }

    translatePost(post: CommunityPost) {
        if (post.translated_text) {
            this.posts.update(posts => posts.map(p => {
                if (p.id === post.id) {
                    return { ...p, show_translation: !p.show_translation };
                }
                return p;
            }));
            return;
        }

        const targetLang = this.languageService.currentLang();
        if (!post.text_content) return;

        // Set translating state
        this.posts.update(posts => posts.map(p => {
            if (p.id === post.id) {
                return { ...p, translating: true };
            }
            return p;
        }));

        this.translationService.translate(post.text_content, targetLang).subscribe({
            next: (translated) => {
                this.posts.update(posts => posts.map(p => {
                    if (p.id === post.id) {
                        return {
                            ...p,
                            translated_text: translated,
                            show_translation: true,
                            translating: false
                        };
                    }
                    return p;
                }));
                const updatedPost = this.posts().find(p => p.id === post.id);
                if (updatedPost) {
                    this.communityStorage.updatePost(updatedPost);
                }
            },
            error: (err) => {
                console.error('Translation failed', err);
                this.posts.update(posts => posts.map(p => {
                    if (p.id === post.id) {
                        return { ...p, translating: false };
                    }
                    return p;
                }));
            }
        });
    }

    likePost(post: CommunityPost) {
        if (!this.currentUser?.id) return;

        this.communityService.likePost(this.currentUser.id, post.id).subscribe({
            next: (res) => {
                this.posts.update(posts => posts.map(p => {
                    if (p.id === post.id) {
                        return {
                            ...p,
                            likes_count: res.likes_count,
                            user_liked: res.liked
                        };
                    }
                    return p;
                }));
                const updatedPost = this.posts().find(p => p.id === post.id);
                if (updatedPost) {
                    this.communityStorage.updatePost(updatedPost);
                }
            },
            error: (err) => console.error('Failed to like post', err)
        });
    }

    openComments(post: CommunityPost) {
        this.selectedPost = post;
        this.showCommentsModal.set(true);
        this.allComments = post.recent_comments || [];

        // Load all comments
        this.communityService.getComments(post.id).subscribe({
            next: (comments) => this.allComments = comments,
            error: (err) => console.error('Failed to load comments', err)
        });
    }

    closeCommentsModal() {
        this.showCommentsModal.set(false);
        this.selectedPost = null;
        this.allComments = [];
    }

    newComment: string = '';

    addComment() {
        if (!this.currentUser?.id || !this.selectedPost || !this.newComment.trim()) return;

        this.communityService.addComment(this.currentUser.id, this.selectedPost.id, this.newComment).subscribe({
            next: (res) => {
                if (res.success && res.comment) {
                    this.allComments.push(res.comment);
                    this.selectedPost!.comments_count++;
                    this.newComment = '';
                }
            },
            error: (err) => console.error('Failed to add comment', err)
        });
    }

    deletePost(post: CommunityPost) {
        if (!this.currentUser?.id || post.user_id !== this.currentUser.id) return;
        if (!confirm('Delete this post?')) return;

        this.communityService.deletePost(this.currentUser.id, post.id).subscribe({
            next: () => {
                this.posts.update(posts => posts.filter(p => p.id !== post.id));
                this.communityStorage.deletePost(post.id);
            },
            error: (err) => {
                console.error('Failed to delete post', err);
                alert('Failed to delete post');
            }
        });
    }

    getMediaUrl(path: string | null): string {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${this.apiUrl}${path}`;
    }

    getAvatarUrl(avatar: string | null): string {
        if (!avatar) return 'default-avatar.png';
        if (avatar.startsWith('http')) return avatar;
        return `${this.apiUrl}${avatar}`;
    }

    formatTimestamp(timestamp: number): string {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - timestamp;

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString();
    }
}
