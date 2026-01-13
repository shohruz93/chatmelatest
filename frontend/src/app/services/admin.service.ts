import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
  last_active: number | string | null;
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

  getUsers(page: number = 1, search: string = '', status: string = 'all', sortBy: string = 'created_at', orderDir: string = 'desc'): Observable<GetUsersResponse> {
    return this.http.get<GetUsersResponse>(`${this.apiUrl}/admin/users`, {
      params: {
        page: page.toString(),
        search,
        status,
        sort_by: sortBy,
        order_dir: orderDir
      }
    }).pipe(
      map((resp: GetUsersResponse) => {
        if (resp && resp.users && Array.isArray(resp.users)) {
          resp.users = resp.users.map((u: any) => {
            if (u.last_active !== undefined && u.last_active !== null) {
              // If server returns seconds, convert to milliseconds for Angular date pipe
              if (typeof u.last_active === 'number') {
                u.last_active = u.last_active * 1000;
              } else if (/^\d+$/.test(String(u.last_active))) {
                u.last_active = Number(u.last_active) * 1000;
              }
            }
            return u;
          });
        }
        return resp;
      })
    );
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

  updateUser(userId: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/update`, { user_id: userId, ...data });
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