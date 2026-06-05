import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PushService {
  private apiUrl = environment.phpBaseUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) { }

  init() {
    // Web push logic can be implemented here later
  }

  private sendTokenToServer(token: string) {
    const userId = this.authService.currentUserValue?.id;
    if (!userId) {
      return;
    }

    const platform = 'web';
    this.http.post(`${this.apiUrl}/push/subscribe`, {
      userId,
      token,
      platform
    }).subscribe(
      () => console.log('Token sent to server'),
      err => console.error('Error sending token to server', err)
    );
  }

  unsubscribe(token: string) {
    if (!token) {
      return;
    }
    this.http.post(`${this.apiUrl}/push/unsubscribe`, { token }).subscribe(
      () => console.log('Token removed from server'),
      err => console.error('Error removing token from server', err)
    );
  }
}
