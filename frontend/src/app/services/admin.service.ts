import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: number;
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
  private apiUrl = 'http://localhost/api';

  constructor(private http: HttpClient) { }

  getUsers(page: number = 1, search: string = ''): Observable<GetUsersResponse> {
    return this.http.get<GetUsersResponse>(`${this.apiUrl}/admin/users`, {
      params: {
        page: page.toString(),
        search
      }
    });
  }

  banUser(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/ban`, { userId });
  }
}