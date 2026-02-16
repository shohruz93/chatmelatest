import { Component, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../../services/socket.service';
import { ApiService } from '../../../services/api.service';
import { HttpClient } from '@angular/common/http';
import { ChatStorageService } from '../../../services/chat-storage.service';

@Component({
  selector: 'app-support-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50 dark:bg-[#0b0e14]">
      <!-- Sidebar: User List -->
      <div class="w-full md:w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151921] flex flex-col z-10 transition-transform duration-300 absolute md:relative h-full" [class.-translate-x-full]="selectedUser && (viewportWidth < 768)" [class.translate-x-0]="!selectedUser || (viewportWidth >= 768)">
        
        <!-- Header -->
        <div class="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
            <div>
              <h2 class="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Messages</h2>
              <p class="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">{{ conversations.length }} active conversations</p>
            </div>
            <!-- Optional: Search trigger icon can go here -->
        </div>
        
        <!-- Conversation List -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          <div *ngIf="conversations.length === 0" class="flex flex-col items-center justify-center h-64 text-center px-6">
             <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
             </div>
             <p class="text-slate-500 font-medium">No open tickets</p>
             <p class="text-slate-400 text-sm mt-1">New support requests will appear here.</p>
          </div>
          
          <div *ngFor="let conv of conversations" 
               (click)="selectUser(conv)"
               class="group relative p-4 rounded-2xl cursor-pointer transition-all duration-200 border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
               [ngClass]="{'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 shadow-sm': selectedUser?.user_id === conv.user_id}">
            
            <div class="flex items-start gap-4">
                <div class="relative flex-shrink-0">
                    <div class="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-slate-100 dark:ring-slate-800 transition-all group-hover:ring-blue-100 dark:group-hover:ring-blue-900/30">
                        <img [src]="conv.avatar || 'default-avatar.png'" class="w-full h-full object-cover">
                    </div>
                    <span *ngIf="conv.unread_count > 0" class="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#151921] px-1 shadow-sm">
                        {{conv.unread_count}}
                    </span>
                    <span *ngIf="isUserOnline(conv.user_id)" class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#151921] rounded-full"></span>
                </div>
                
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-baseline mb-1">
                        <h3 class="font-bold text-slate-800 dark:text-white truncate pr-2" [ngClass]="{'text-blue-700 dark:text-blue-400': selectedUser?.user_id === conv.user_id}">{{conv.name}}</h3>
                        <span class="text-[10px] font-bold text-slate-400 whitespace-nowrap">{{formatDate(conv.last_message_time)}}</span>
                    </div>
                    <p class="text-sm text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5" [ngClass]="{'font-semibold text-slate-700 dark:text-slate-300': conv.unread_count > 0}">
                        <span *ngIf="isCurrentUser(conv.last_message_sender_id)" class="text-xs text-blue-500 font-bold">You:</span>
                        <span *ngIf="detectMessageType(conv.last_message) === 'image'" class="flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> Photo</span>
                        <span *ngIf="detectMessageType(conv.last_message) === 'voice'" class="flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg> Voice</span>
                        <span *ngIf="detectMessageType(conv.last_message) === 'text'">{{conv.last_message}}</span>
                    </p>
                </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="flex-1 flex flex-col bg-slate-50/50 dark:bg-[#0b0e14] relative min-w-0 transition-opacity duration-200" [class.opacity-0]="!selectedUser && (viewportWidth < 768)" [class.opacity-100]="selectedUser || (viewportWidth >= 768)">
        
        <!-- Empty State -->
        <div *ngIf="!selectedUser" class="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8">
            <div class="w-24 h-24 bg-white dark:bg-[#151921] rounded-3xl shadow-xl shadow-blue-500/5 flex items-center justify-center mb-6 animate-bounce-slow">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </div>
            <h3 class="text-2xl font-black text-slate-800 dark:text-white mb-2">Welcome to Support</h3>
            <p class="text-slate-500 dark:text-slate-400 max-w-sm">Select a ticket from the sidebar to view conversation history and respond to user inquiries.</p>
        </div>

        <div *ngIf="selectedUser" class="flex-1 flex flex-col h-full absolute inset-0 md:static bg-white dark:bg-[#0b0e14]">
          <!-- Chat Header -->
          <div class="px-6 py-4 bg-white/80 dark:bg-[#151921]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-20 shadow-sm sticky top-0">
            <div class="flex items-center gap-4">
              <button class="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full" (click)="selectedUser = null">
                 <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              
              <div class="relative">
                 <img [src]="selectedUser.avatar || 'default-avatar.png'" class="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-100 dark:ring-slate-700">
                 <span *ngIf="isUserOnline(selectedUser.user_id)" class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#151921] rounded-full"></span>
              </div>
              
              <div>
                <h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    {{selectedUser.name}}
                    <span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-wide">User</span>
                </h3>
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{selectedUser.email}}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
                <button class="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all" title="View Profile">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </button>
            </div>
          </div>

          <!-- Messages -->
          <div #messagesContainer class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50 dark:bg-[#0b0e14] scroll-smooth custom-scrollbar">
             <div *ngFor="let message of messages; let i = index; let last = last" 
                  [ngClass]="{'items-end': isCurrentUser(message.sender_id), 'items-start': !isCurrentUser(message.sender_id)}"
                  class="flex flex-col w-full animate-fade-in-up" [style.animation-delay]="last ? '0ms' : '0ms'">
                  
               <div class="flex max-w-[85%] md:max-w-[70%] gap-3" [ngClass]="{'flex-row-reverse': isCurrentUser(message.sender_id)}">
                   <!-- Sender Avatar (Small) -->
                   <div class="flex-shrink-0 self-end mb-1">
                       <img *ngIf="!isCurrentUser(message.sender_id)" [src]="selectedUser.avatar || 'default-avatar.png'" class="w-8 h-8 rounded-full bg-slate-200">
                   </div>

                   <div class="flex flex-col" [ngClass]="{'items-end': isCurrentUser(message.sender_id), 'items-start': !isCurrentUser(message.sender_id)}">
                       <span *ngIf="i === 0 || shouldShowTime(messages[i-1], message)" class="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider text-center w-full block bg-slate-200/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full mx-auto self-center mb-4 mt-2">
                           {{formatDateLong(message.created_at)}}
                       </span>
                       
                       <div [ngClass]="{
                           'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-none shadow-md shadow-blue-500/20': isCurrentUser(message.sender_id),
                           'bg-white dark:bg-[#1e2330] text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-800 shadow-sm': !isCurrentUser(message.sender_id)
                         }" class="px-5 py-3 overflow-hidden transition-all hover:shadow-md relative group">
                         
                          <!-- Content Switch -->
                          <ng-container [ngSwitch]="message.messageType">
                            <!-- Image -->
                            <div *ngSwitchCase="'image'" class="-m-2">
                                <img [src]="message.content" class="max-w-full rounded-xl cursor-pointer hover:opacity-95 transition-opacity" 
                                     style="max-height: 350px;" (click)="viewImage(message.content)">
                            </div>
                            
                            <!-- Voice -->
                            <div *ngSwitchCase="'voice'" class="flex items-center space-x-3 min-w-[220px] py-1">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center bg-white/20">
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/></svg>
                                </div>
                                <audio [src]="message.content" controls class="w-full h-8 accent-white" [class.filter-brightness-0-invert]="isCurrentUser(message.sender_id)"></audio>
                            </div>
                            
                            <!-- Text (Default) -->
                            <p *ngSwitchDefault class="whitespace-pre-wrap leading-relaxed text-[15px]">{{message.content}}</p>
                          </ng-container>
                          
                          <!-- Message Metadata (Time & Status) -->
                          <div class="flex items-center justify-end gap-1 mt-1 opacity-70" [class.text-blue-100]="isCurrentUser(message.sender_id)" [class.text-slate-400]="!isCurrentUser(message.sender_id)">
                              <span class="text-[10px] font-medium">{{formatTime(message.created_at)}}</span>
                              <span *ngIf="isCurrentUser(message.sender_id)">
                                  <!-- Checks (Single or Double) could go here if status tracked -->
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                  </svg>
                              </span>
                          </div>
                   
                       </div>
                   </div>
               </div>
             </div>
          </div>

          <!-- Input Area -->
          <div class="p-4 md:p-6 bg-white dark:bg-[#151921] border-t border-slate-200 dark:border-slate-800 shrink-0 z-20">
            <form (submit)="sendMessage()" class="flex items-end gap-3 max-w-4xl mx-auto">
              <!-- Attach Button (Placeholder) -->
              <button type="button" class="p-3 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
              </button>

              <div class="flex-1 bg-slate-100 dark:bg-slate-800 rounded-3xl p-1 flex items-center ring-1 ring-transparent focus-within:ring-blue-500/50 transition-all">
                  <textarea [(ngModel)]="newMessage" (keydown.enter.prevent)="sendMessage()" name="message" rows="1" placeholder="Type your message..." 
                     class="w-full bg-transparent px-4 py-3 max-h-32 focus:outline-none resize-none text-slate-800 dark:text-white placeholder-slate-400 scrollbar-hide"></textarea>
              </div>
              
              <button type="submit" [disabled]="!newMessage.trim()" 
                      class="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
            <p class="text-center text-[10px] text-slate-400 mt-2">Enter to send • Shift + Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    
    @keyframes fade-in-up {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
  `]
})
export class SupportChatComponent implements OnInit {
  conversations: any[] = [];
  selectedUser: any = null;
  messages: any[] = [];
  newMessage: string = '';
  currentUser: any = null;
  roomId: string | null = null;
  viewportWidth: number = 0;
  private http = inject(HttpClient);
  private chatStorage = inject(ChatStorageService);

  constructor(
    private socketService: SocketService,
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.viewportWidth = window.innerWidth;
      window.addEventListener('resize', () => this.viewportWidth = window.innerWidth);
    }
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        this.currentUser = JSON.parse(userStr);
        this.chatStorage.openDb(this.currentUser.id); // Open DB for the admin
        this.loadConversations();
        this.setupSocketListeners();
      }
    }
  }

  loadConversations() {
    this.apiService.post('/admin/support/conversations', { adminId: this.currentUser.id })
      .subscribe({
        next: (data: any[]) => {
          this.conversations = data.map((conv: any) => {
            if (conv.avatar && !conv.avatar.startsWith('http')) {
              conv.avatar = `${this.apiService.phpBaseUrl}${conv.avatar}`;
            }
            return conv;
          });
        },
        error: (err) => console.error('Error loading conversations', err)
      });
  }

  setupSocketListeners() {
    // Listen for storage changes, which indicates a new message has arrived or been synced
    this.chatStorage.messagesUpdated$.subscribe(() => {
      // If we are currently chatting with a user, refresh the messages
      if (this.selectedUser) {
        this.loadLocalMessages(this.roomId!);
      }
      // Always refresh conversations to update last message/unread count
      this.loadConversations();
    });
  }

  async selectUser(user: any) {
    // Avatar fix
    if (user.avatar && !user.avatar.startsWith('http')) {
      user.avatar = `${this.apiService.phpBaseUrl}${user.avatar}`;
    }
    this.selectedUser = user;
    this.messages = [];

    // Construct Room ID: Lower ID first
    const sortedIds = [this.currentUser.id, user.user_id].sort((a, b) => a - b);
    this.roomId = `room_${sortedIds[0]}_${sortedIds[1]}`;

    this.socketService.emit('join_chat', { roomId: this.roomId });

    // Load messages from local storage first
    await this.loadLocalMessages(this.roomId);

    // Then, sync with the server
    this.socketService.loadMessages(this.roomId!, 50, 0);

    // Mark as read immediately when opening chat
    this.markAsRead(user.user_id);
  }

  async loadLocalMessages(roomId: string) {
    const localMessages = await this.chatStorage.getMessages(roomId, 100, 0); // Load more for support chat
    this.messages = localMessages.map((msg: any) => ({
      ...msg,
      messageType: this.detectMessageType(msg.content, msg.type)
    }));
    this.scrollToBottom();
  }

  markAsRead(senderId: number) {
    if (this.roomId) {
      this.socketService.emit('mark_as_read', {
        roomId: this.roomId,
        senderId: senderId
      });
    }
  }

  async sendMessage() {
    if (!this.newMessage.trim() || !this.roomId) return;

    const content = this.newMessage;
    const tempId = `temp_${Date.now()}`;

    this.socketService.sendMessage(this.roomId, content, 'en', 'text', null, tempId); // Admin sends in En default for now

    // Optimistic update to local storage
    const messageObj = {
      id: tempId,
      roomId: this.roomId,
      sender_id: this.currentUser.id,
      content: content,
      created_at: new Date().getTime(),
      messageType: 'text',
      status: 'sending'
    };
    await this.chatStorage.addMessage(messageObj);

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

  isUserOnline(userId: number): boolean {
    return this.socketService.onlineUsers().has(userId);
  }

  shouldShowTime(prevMsg: any, currMsg: any): boolean {
    if (!prevMsg) return true;
    const prevTime = new Date(prevMsg.created_at).getTime();
    const currTime = new Date(currMsg.created_at).getTime();
    return (currTime - prevTime) > 30 * 60 * 1000; // 30 mins
  }

  formatDateLong(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
