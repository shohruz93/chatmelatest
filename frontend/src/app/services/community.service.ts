import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEventType, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CommunityPost {
    id: number;
    user_id: number;
    user_name: string;
    user_avatar: string;
    content_type: 'text' | 'image' | 'video';
    text_content: string;
    media_path: string | null;
    video_duration: number;
    likes_count: number;
    comments_count: number;
    views_count?: number;
    user_liked: boolean;
    recent_comments: CommunityComment[];
    created_at: number;
    // Translation properties
    translated_text?: string;
    show_translation?: boolean;
    translating?: boolean;
}

export interface CommunityComment {
    id: number;
    user_id: number;
    user_name: string;
    user_avatar: string;
    content: string;
    created_at: number;
}

@Injectable({
    providedIn: 'root'
})
export class CommunityService {
    private http = inject(HttpClient);
    private apiUrl = environment.phpBaseUrl;

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('token');
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    }

    createTextPost(userId: number, textContent: string): Observable<any> {
        const formData = new FormData();
        formData.append('content_type', 'text');
        formData.append('text_content', textContent);

        return this.http.post(
            `${this.apiUrl}/community/post?userId=${userId}`,
            formData,
            { headers: this.getHeaders() }
        );
    }

    createMediaPost(userId: number, file: File, contentType: 'image' | 'video', textContent: string = '', videoDuration: number = 0): Observable<any> {
        const formData = new FormData();
        formData.append('content_type', contentType);
        formData.append('media', file);
        formData.append('text_content', textContent);
        if (contentType === 'video') {
            formData.append('video_duration', videoDuration.toString());
        }

        return this.http.post(
            `${this.apiUrl}/community/post?userId=${userId}`,
            formData,
            {
                headers: this.getHeaders(),
                reportProgress: true,
                observe: 'events'
            }
        ).pipe(
            map((event: HttpEvent<any>) => {
                if (event.type === HttpEventType.UploadProgress) {
                    const progress = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
                    return { type: 'progress', progress };
                } else if (event.type === HttpEventType.Response) {
                    return { type: 'response', body: event.body };
                }
                return { type: 'other' };
            })
        );
    }

    getFeed(viewerId?: number, page: number = 1, limit: number = 20, sort: string = 'newest', timeRange: string = 'all'): Observable<CommunityPost[]> {
        let url = `${this.apiUrl}/community/feed?page=${page}&limit=${limit}&sort=${sort}&time_range=${timeRange}`;
        if (viewerId) {
            url += `&viewerId=${viewerId}`;
        }
        return this.http.get<CommunityPost[]>(url, { headers: this.getHeaders() });
    }

    getUserPosts(userId: number, viewerId?: number, page: number = 1, limit: number = 20): Observable<CommunityPost[]> {
        let url = `${this.apiUrl}/community/user?userId=${userId}&page=${page}&limit=${limit}`;
        if (viewerId) {
            url += `&viewerId=${viewerId}`;
        }
        return this.http.get<CommunityPost[]>(url, { headers: this.getHeaders() });
    }

    likePost(userId: number, postId: number): Observable<any> {
        return this.http.post(
            `${this.apiUrl}/community/react?userId=${userId}`,
            { postId },
            { headers: this.getHeaders() }
        );
    }

    viewPost(postId: number): Observable<any> {
        return this.http.post(
            `${this.apiUrl}/community/view`,
            { postId },
            { headers: this.getHeaders() }
        );
    }

    addComment(userId: number, postId: number, content: string): Observable<any> {
        return this.http.post(
            `${this.apiUrl}/community/comment?userId=${userId}`,
            { postId, content },
            { headers: this.getHeaders() }
        );
    }

    getComments(postId: number, page: number = 1, limit: number = 20): Observable<CommunityComment[]> {
        return this.http.get<CommunityComment[]>(
            `${this.apiUrl}/community/comments?postId=${postId}&page=${page}&limit=${limit}`,
            { headers: this.getHeaders() }
        );
    }

    deletePost(userId: number, postId: number): Observable<any> {
        return this.http.delete(
            `${this.apiUrl}/community/post?userId=${userId}&postId=${postId}`,
            { headers: this.getHeaders() }
        );
    }
}
