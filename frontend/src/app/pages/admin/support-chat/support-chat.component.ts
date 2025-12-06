import { Component, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../../services/socket.service';
import { ApiService } from '../../../services/api.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-support-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50 dark:bg-gray-900">
      <!-- Sidebar: User List -->
      <div class="w-1/3 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-xl font-bold text-gray-800 dark:text-white">Support Chats</h2>
        </div>
        
        <div class="flex-1 overflow-y-auto">
          <div *ngIf="conversations.length === 0" class="p-6 text-center text-gray-500">
            No active support conversations.
          </div>
          
          <div *ngFor="let conv of conversations" 
               (click)="selectUser(conv)"
               [class.bg-blue-50]="selectedUser?.user_id === conv.user_id"
               [class.dark:bg-blue-900]="selectedUser?.user_id === conv.user_id"
               class="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center transition-colors">
            
            <div class="relative">
              <img [src]="conv.avatar || 'assets/default-avatar.png'" class="w-12 h-12 rounded-full object-cover">
              <span *ngIf="conv.unread_count > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {{conv.unread_count}}
              </span>
            </div>
            
            <div class="ml-4 flex-1 overflow-hidden">
              <div class="flex justify-between items-start">
                <h3 class="font-semibold text-gray-800 dark:text-white">{{conv.name}}</h3>
                <span class="text-xs text-gray-400">{{formatDate(conv.last_message_time)}}</span>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate w-full">
                <span *ngIf="detectMessageType(conv.last_message) === 'image'">📷 Image</span>
                <span *ngIf="detectMessageType(conv.last_message) === 'voice'">🎤 Voice Message</span>
                <span *ngIf="detectMessageType(conv.last_message) === 'text'">{{conv.last_message}}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="flex-1 flex flex-col bg-white dark:bg-gray-900 relative min-h-0">
        <div *ngIf="!selectedUser" class="flex-1 flex flex-col items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>Select a conversation to start chatting</p>
        </div>

        <div *ngIf="selectedUser" class="flex-1 flex flex-col min-h-0">
          <!-- Chat Header -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
            <div class="flex items-center">
              <img [src]="selectedUser.avatar || 'assets/default-avatar.png'" class="w-10 h-10 rounded-full object-cover">
              <div class="ml-3">
                <h3 class="font-bold text-gray-800 dark:text-white">{{selectedUser.name}}</h3>
                <p class="text-xs text-gray-500">{{selectedUser.email}}</p>
              </div>
            </div>
          </div>

          <!-- Messages -->
          <div #messagesContainer class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 scroll-smooth">
             <div *ngFor="let message of messages" 
                  [ngClass]="{'self-end': isCurrentUser(message.sender_id), 'self-start': !isCurrentUser(message.sender_id)}"
                  class="flex flex-col max-w-[70%]" 
                  [class.items-end]="isCurrentUser(message.sender_id)" 
                  [class.items-start]="!isCurrentUser(message.sender_id)">
                  
               <div [ngClass]="{
                   'bg-blue-600 text-white rounded-tr-none': isCurrentUser(message.sender_id),
                   'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-700': !isCurrentUser(message.sender_id)
                 }" class="px-4 py-2 rounded-2xl shadow-sm overflow-hidden break-words max-w-full">
                 
                  <!-- Content Switch -->
                  <ng-container [ngSwitch]="message.messageType">
                    <!-- Image -->
                    <div *ngSwitchCase="'image'">
                        <img [src]="message.content" class="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" 
                             style="max-height: 300px;" (click)="viewImage(message.content)">
                    </div>
                    
                    <!-- Voice -->
                    <div *ngSwitchCase="'voice'" class="flex items-center space-x-2 min-w-[200px]">
                        <audio [src]="message.content" controls class="w-full h-8 max-w-[250px]"></audio>
                    </div>
                    
                    <!-- Text (Default) -->
                    <p *ngSwitchDefault class="whitespace-pre-wrap break-words">{{message.content}}</p>
                  </ng-container>

               </div>
               <span class="text-xs text-gray-400 mt-1">{{formatTime(message.created_at)}}</span>
             </div>
          </div>

          <!-- Input Area -->
          <div class="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <form (submit)="sendMessage()" class="flex items-center space-x-2">
              <input type="text" [(ngModel)]="newMessage" name="message" placeholder="Type your reply..." 
                     class="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <button type="submit" [disabled]="!newMessage.trim()" 
                      class="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .dark ::-webkit-scrollbar-thumb { background: #475569; }
  `]
})
export class SupportChatComponent implements OnInit {
  conversations: any[] = [];
  selectedUser: any = null;
  messages: any[] = [];
  newMessage: string = '';
  currentUser: any = null;
  roomId: string | null = null;
  private http = inject(HttpClient);

  constructor(
    private socketService: SocketService,
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        this.currentUser = JSON.parse(userStr);
        this.loadConversations();
        this.setupSocketListeners();
      }
    }
  }

  loadConversations() {
    this.http.post<any[]>('http://localhost:8000/admin/support/conversations', { adminId: this.currentUser.id })
      .subscribe({
        next: (data: any[]) => {
          this.conversations = data.map((conv: any) => {
            if (conv.avatar && !conv.avatar.startsWith('http')) {
              conv.avatar = `http://localhost:8000${conv.avatar}`;
            }
            return conv;
          });
        },
        error: (err) => console.error('Error loading conversations', err)
      });
  }

  setupSocketListeners() {
    this.socketService.onMessage().subscribe((msg: any) => {
      // If we are currently chatting with this user, append message
      if (this.selectedUser && (msg.senderId == this.selectedUser.user_id || msg.senderId == this.currentUser.id)) {
        this.messages.push({
          sender_id: msg.senderId,
          content: msg.content,
          created_at: new Date(),
          messageType: this.detectMessageType(msg.content, msg.type)
        });
        this.scrollToBottom();

        // Mark as read immediately if the message is from the user we are chatting with
        if (msg.senderId == this.selectedUser.user_id) {
          this.markAsRead(msg.senderId);
        }
      }
      // Refresh conversations to update last message/unread count
      this.loadConversations();
    });
  }

  selectUser(user: any) {
    // Avatar fix
    if (user.avatar && !user.avatar.startsWith('http')) {
      user.avatar = `http://localhost:8000${user.avatar}`;
    }
    this.selectedUser = user;
    this.messages = [];

    // Construct Room ID: Lower ID first
    const sortedIds = [this.currentUser.id, user.user_id].sort();
    this.roomId = `room_${sortedIds[0]}_${sortedIds[1]}`;

    this.socketService.emit('join_chat', { roomId: this.roomId });

    // Load messages
    this.socketService.loadMessages(this.roomId!, 50, 0);

    // Subscribe to loaded messages (one-time)
    const sub = this.socketService.onMessagesLoaded().subscribe((data: any) => {
      if (data.roomId === this.roomId) {
        this.messages = data.messages.map((msg: any) => ({
          ...msg,
          messageType: this.detectMessageType(msg.content, msg.type)
        }));
        this.scrollToBottom();
        sub.unsubscribe();
      }
    });

    // Mark as read immediately when opening chat
    this.markAsRead(user.user_id);
  }

  markAsRead(senderId: number) {
    if (this.roomId) {
      this.socketService.emit('mark_as_read', {
        roomId: this.roomId,
        senderId: senderId
      });
    }
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.roomId) return;

    const content = this.newMessage;
    this.socketService.sendMessage(this.roomId, content, 'en', 'text'); // Admin sends in En default for now

    // Optimistic update
    this.messages.push({
      sender_id: this.currentUser.id,
      content: content,
      created_at: new Date(),
      messageType: 'text'
    });

    this.newMessage = '';
    this.scrollToBottom();
  }

  isCurrentUser(senderId: any): boolean {
    return Number(senderId) === Number(this.currentUser.id);
  }

  scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.overflow-y-auto.space-y-4');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  detectMessageType(content: string, providedType?: string): string {
    // Logic from ChatComponent
    if (providedType && providedType !== 'text') {
      return providedType;
    }

    if (content && typeof content === 'string') {
      if (content.startsWith('data:audio') || content.endsWith('.webm') || content.endsWith('.mp3') || content.endsWith('.wav')) {
        return 'voice';
      }
      if (content.startsWith('data:image') || content.match(/\.(jpeg|jpg|gif|png)$/i) != null) {
        return 'image';
      }
    }

    return 'text';
  }

  viewImage(imageUrl: string) {
    window.open(imageUrl, '_blank');
  }
}
