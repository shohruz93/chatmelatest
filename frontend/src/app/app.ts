import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SocketService } from './services/socket.service';
import { Subscription } from 'rxjs';

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
  incomingRequest: any = null;
  private chatRequestSub!: Subscription;

  ngOnInit() {
    // Global listener for incoming chat requests
    this.chatRequestSub = this.socketService.onChatRequestReceived().subscribe(request => {
      // Always show modal in App component
      this.incomingRequest = request;
      this.showIncomingRequestModal = true;
    });
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
}
