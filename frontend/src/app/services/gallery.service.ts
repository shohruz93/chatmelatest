import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GalleryImage {
    id: number;
    user_id: number;
    image_path: string;
    caption: string;
    likes_count: number;
    dislikes_count: number;
    user_liked: boolean;
    user_disliked: boolean;
    created_at: number;
}

@Injectable({
    providedIn: 'root'
})
export class GalleryService {
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

    uploadImage(userId: number, file: File, caption: string = ''): Observable<any> {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('caption', caption);

        return this.http.post(
            `${this.apiUrl}/gallery/upload?userId=${userId}`,
            formData,
            { headers: this.getHeaders() }
        );
    }

    getGallery(userId: number, viewerId?: number): Observable<GalleryImage[]> {
        let url = `${this.apiUrl}/gallery?userId=${userId}`;
        if (viewerId) {
            url += `&viewerId=${viewerId}`;
        }
        return this.http.get<GalleryImage[]>(url, { headers: this.getHeaders() });
    }

    react(userId: number, imageId: number, type: 'like' | 'dislike'): Observable<any> {
        return this.http.post(
            `${this.apiUrl}/gallery/react?userId=${userId}`,
            { imageId, type },
            { headers: this.getHeaders() }
        );
    }

    deleteImage(userId: number, imageId: number): Observable<any> {
        return this.http.delete(
            `${this.apiUrl}/gallery?userId=${userId}&imageId=${imageId}`,
            { headers: this.getHeaders() }
        );
    }
}
