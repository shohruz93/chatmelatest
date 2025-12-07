import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: number; // 0 or 1
  avatar?: string;
  gender?: string;
  status?: string;
  created_at: string;
  last_active: string;
}

export interface GetUsersResponse {
  users: User[];
  total: number;
  page: number;
  pages: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  public apiUrl = environment.phpBaseUrl;

  constructor(private http: HttpClient) { }

  getUsers(page: number = 1, search: string = '', status: string = 'all'): Observable<GetUsersResponse> {
    return this.http.get<GetUsersResponse>(`${this.apiUrl}/admin/users`, {
      params: {
        page: page.toString(),
        search,
        status
      }
    });
  }

  banUser(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/ban`, { userId });
  }

  unbanUser(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/unban`, { userId });
  }

  toggleAdmin(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/toggle-admin`, { userId });
  }

  getUserDetails(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/users/details`, {
      params: { id: userId.toString() }
    });
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/stats`);
  }
}