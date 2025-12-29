import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AppVersionService {
    private apiUrl = environment.phpBaseUrl;

    constructor(private http: HttpClient) { }

    checkLatestVersion(platform: 'android' | 'ios'): Observable<any> {
        return this.http.get(`${this.apiUrl}/app/version?platform=${platform}`);
    }

    uploadAppVersion(formData: FormData): Observable<HttpEvent<any>> {
        return this.http.post(`${this.apiUrl}/admin/apps/upload`, formData, {
            reportProgress: true,
            observe: 'events'
        });
    }

    getAppVersions(): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/apps`);
    }
}
