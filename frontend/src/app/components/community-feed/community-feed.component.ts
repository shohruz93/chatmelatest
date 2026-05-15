import { Component, OnInit, inject, signal, Input } from '@angular/core';
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

    @Input() filterUserId?: number;  // If set, shows only this user's posts
    @Input() showCreateForm: boolean = true;  // Show/hide post creation form

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

    // NSFW setting (read from localStorage, set in profile settings)
    nsfwAllowed: boolean = false;

    // View Tracking
    private observedPosts = new Set<number>();
    private viewObserver: IntersectionObserver | null = null;

    ngOnInit() {
        this.nsfwAllowed = localStorage.getItem('allow_nsfw_content') === 'true';
        if (this.currentUser?.id) {
            this.communityStorage.openDb(this.currentUser.id).then(() => {
                this.loadLocalFeed();
                this.loadFeed(true);
            });
        }
        this.setupViewObserver();
    }

    ngOnDestroy() {
        if (this.viewObserver) {
            this.viewObserver.disconnect();
        }
    }

    setupViewObserver() {
        this.viewObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const postId = Number(entry.target.getAttribute('data-post-id'));
                    if (postId && !this.observedPosts.has(postId)) {
                        this.observedPosts.add(postId);
                        this.trackView({ id: postId } as CommunityPost);
                        // Optional: Stop observing once viewed
                        // this.viewObserver?.unobserve(entry.target); 
                    }
                }
            });
        }, {
            threshold: 0.5 // Trigger when 50% of the post is visible
        });
    }

    observePost(element: Element) {
        if (this.viewObserver) {
            this.viewObserver.observe(element);
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

        const request$ = this.filterUserId
            ? this.communityService.getUserPosts(this.filterUserId, this.currentUser?.id, this.page(), 10)
            : this.communityService.getFeed(
                this.currentUser?.id,
                this.page(),
                10,
                this.sortBy(),
                this.timeRange()
            );

        request$.subscribe({
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

                // Observe new posts after render
                setTimeout(() => {
                    const postElements = document.querySelectorAll('.post-card');
                    postElements.forEach(el => this.observePost(el));
                }, 100);
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
        if (!this.currentUser?.id) return;

        this.communityService.viewPost(this.currentUser.id, post.id).subscribe({
            next: () => {
                this.posts.update(posts => posts.map(p => {
                    if (p.id === post.id) {
                        return {
                            ...p,
                            views_count: (p.views_count || 0) + 1
                        };
                    }
                    return p;
                }));
            },
            error: (err) => console.error('Failed to track view', err)
        });
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
                    alert(this.languageService.get('COMMUNITY.ALERT_VIDEO_DURATION'));
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
                alert(this.languageService.get('COMMUNITY.ALERT_ENTER_TEXT'));
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
                    alert(this.languageService.get('COMMUNITY.ALERT_CREATE_FAILED'));
                    this.uploadProgress.set(false);
                }
            });
        } else {
            if (!this.postFile) {
                alert(this.languageService.get('COMMUNITY.ALERT_SELECT_FILE'));
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
                    alert(this.languageService.get('COMMUNITY.ALERT_CREATE_FAILED'));
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
        if (!confirm(this.languageService.get('COMMUNITY.ALERT_DELETE_CONFIRM'))) return;

        this.communityService.deletePost(this.currentUser.id, post.id).subscribe({
            next: () => {
                this.posts.update(posts => posts.filter(p => p.id !== post.id));
                this.communityStorage.deletePost(post.id);
            },
            error: (err) => {
                console.error('Failed to delete post', err);
                alert(this.languageService.get('COMMUNITY.ALERT_DELETE_FAILED'));
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

        if (diff < 60) return this.languageService.get('COMMUNITY.TIME_JUST_NOW');
        if (diff < 3600) return this.languageService.get('COMMUNITY.TIME_M_AGO', { count: Math.floor(diff / 60) });
        if (diff < 86400) return this.languageService.get('COMMUNITY.TIME_H_AGO', { count: Math.floor(diff / 3600) });
        if (diff < 604800) return this.languageService.get('COMMUNITY.TIME_D_AGO', { count: Math.floor(diff / 86400) });

        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString();
    }
}
