import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SocketService } from './services/socket.service';
import { Subscription } from 'rxjs';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private socketService = inject(SocketService);
  private router = inject(Router);

  showIncomingRequestModal = false;
  showExitModal = false;
  incomingRequest: any = null;
  private chatRequestSub!: Subscription;

  ngOnInit() {
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
      } else {
        this.handleInternetRestored();
      }
    });

    // Initial check
    this.checkInitialNetwork();

    // Back button listener for Android
    if (Capacitor.getPlatform() === 'android') {
      NativeApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          this.showExitModal = true;
        } else {
          // If there's a history, let the router handle it or just do nothing
          // Capacitor usually handles router history automatically
          window.history.back();
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
