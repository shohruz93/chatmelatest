import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
  PermissionStatus,
} from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
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
    if (Capacitor.getPlatform() !== 'web') {
      this.registerPush();
    }
  }

  private registerPush() {
    PushNotifications.requestPermissions().then((result: PermissionStatus) => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      } else {
        // Show some error
      }
    });

    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token: ' + token.value);
      this.sendTokenToServer(token.value);
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push received: ' + JSON.stringify(notification));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      const data = notification.notification.data;
      console.log('Push action performed: ' + JSON.stringify(notification));
      if (data.type === 'message') {
        this.router.navigate(['/dashboard/chat', data.senderId]);
      } else if (data.type === 'guest') {
        this.router.navigate(['/guests']);
      }
    });
  }

  private sendTokenToServer(token: string) {
    const userId = this.authService.currentUserValue?.id;
    if (!userId) {
      return;
    }

    const platform = Capacitor.getPlatform();
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
