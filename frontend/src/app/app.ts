import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { SocketService } from './services/socket.service';
import { PushService } from './services/push.service';
import { HeartbeatService } from './services/heartbeat.service';
import { CallService } from './services/call.service';
import { Subscription } from 'rxjs';


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
  private cdr = inject(ChangeDetectorRef);

  showIncomingRequestModal = false;
  showExitModal = false;
  incomingRequest: any = null;
  private chatRequestSub!: Subscription;

  // Real-time network properties
  isOffline = false;
  showOnlineStatus = false;
  private onlineStatusTimeout: any = null;
  private socketSub!: Subscription;

  ngOnInit() {
    this.pushService.init();

    // Listen to Socket connection state
    let firstEmission = true;
    this.socketSub = this.socketService.connectionState$.subscribe(connected => {
      console.log('Socket connection state changed:', connected);
      if (firstEmission) {
        firstEmission = false;
        // Only set offline initially if the browser itself is offline
        if (!connected && !navigator.onLine) {
          this.isOffline = true;
          this.cdr.detectChanges();
        }
        return;
      }

      if (!connected) {
        this.handleNoInternet();
      } else {
        this.handleInternetRestored();
      }
    });

    // Global listener for incoming chat requests
    this.chatRequestSub = this.socketService.onChatRequestReceived().subscribe(request => {
      // Always show modal in App component
      this.incomingRequest = request;
      this.showIncomingRequestModal = true;
    });

    // Back button listener for Android removed
  }

  handleNoInternet() {
    console.log('App: No internet connection (Socket disconnected)');
    if (this.isOffline) return; // Already offline
    
    this.isOffline = true;
    this.showOnlineStatus = false;
    if (this.onlineStatusTimeout) {
      clearTimeout(this.onlineStatusTimeout);
    }
    this.cdr.detectChanges();
  }

  handleInternetRestored() {
    console.log('App: Internet connection restored (Socket connected)');
    if (this.isOffline) {
      this.isOffline = false;
      this.showOnlineStatus = true;
      if (this.onlineStatusTimeout) {
        clearTimeout(this.onlineStatusTimeout);
      }
      this.onlineStatusTimeout = setTimeout(() => {
        this.showOnlineStatus = false;
        this.cdr.detectChanges();
      }, 4000);
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    if (this.chatRequestSub) this.chatRequestSub.unsubscribe();
    if (this.socketSub) this.socketSub.unsubscribe();
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
    // NativeApp.exitApp(); removed
  }

  closeExitModal() {
    this.showExitModal = false;
  }
}
