import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = 'http://localhost:8000'; // Hardcoded for now as per environment usually

    constructor(private http: HttpClient) { }

    getStats(): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/stats`);
    }

    getUsers(page: number = 1, search: string = ''): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/users?page=${page}&search=${search}`);
    }

    banUser(userId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/users/ban`, { user_id: userId });
    }
}
