import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = 'http://localhost:8000'; // Adjust if PHP server port differs

    constructor(private http: HttpClient) { }

    private getHeaders() {
        const token = localStorage.getItem('token');
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    }

    get(endpoint: string, params: any = {}): Observable<any> {
        return this.http.get(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders(), params });
    }

    post(endpoint: string, data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}${endpoint}`, data, { headers: this.getHeaders() });
    }
}
