import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { SocketService } from './services/socket.service';
import { PushService } from './services/push.service';
import { HeartbeatService } from './services/heartbeat.service';
import { CallService } from './services/call.service';
import { Subscription } from 'rxjs';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';

import { TranslatePipe } from './pipes/translate.pipe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private socketService = inject(SocketService);
  private router = inject(Router);
  private location = inject(Location);
  private pushService = inject(PushService);
  private heartbeatService = inject(HeartbeatService);
  public callService = inject(CallService);

  showIncomingRequestModal = false;
  showExitModal = false;
  incomingRequest: any = null;
  private chatRequestSub!: Subscription;

  ngOnInit() {
    this.pushService.init();

    // Global listener for incoming chat requests
    this.chatRequestSub = this.socketService.onChatRequestReceived().subscribe(request => {
      // Always show modal in App component
      this.incomingRequest = request;
      this.showIncomingRequestModal = true;
    });

    // Network status listener
    Network.addListener('networkStatusChange', status => {
      console.log('Network status changed', status);
      if (!status.connected) {
        this.handleNoInternet();
      }
      else {
        this.handleInternetRestored();
      }
    });

    // Initial check
    this.checkInitialNetwork();

    // Back button listener for Android
    if (Capacitor.getPlatform() === 'android') {
      NativeApp.addListener('backButton', () => {
        const url = this.router.url || '';
        // If user is on the Explore page, show exit confirmation
        if (url.includes('/explore')) {
          this.showExitModal = true;
        } else {
          // Otherwise navigate back to the previous page
          this.location.back();
        }
      });
    }
  }

  async checkInitialNetwork() {
    const status = await Network.getStatus();
    if (!status.connected) {
      this.handleNoInternet();
    }
  }

  handleNoInternet() {
    const message = 'Internet connection lost. Please check your network settings.';
    if (Capacitor.isNativePlatform()) {
      alert(message);
    } else {
      console.warn(message);
    }
  }

  handleInternetRestored() {
    const message = 'Internet connection restored.';
    if (Capacitor.isNativePlatform()) {
      console.log(message);
      // Optional: alert('Internet connection restored.');
    }
  }

  ngOnDestroy() {
    if (this.chatRequestSub) this.chatRequestSub.unsubscribe();
  }

  acceptChatRequest() {
    if (this.incomingRequest) {
      this.socketService.acceptChatRequest(this.incomingRequest.socketId);
      this.showIncomingRequestModal = false;
      this.router.navigate(['/chat']);
    }
  }

  rejectChatRequest() {
    if (this.incomingRequest) {
      this.socketService.rejectChatRequest(this.incomingRequest.socketId);
      this.showIncomingRequestModal = false;
      this.incomingRequest = null;
    }
  }

  confirmExit() {
    NativeApp.exitApp();
  }

  closeExitModal() {
    this.showExitModal = false;
  }
}
