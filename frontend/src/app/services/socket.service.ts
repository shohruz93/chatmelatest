import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    private socket: Socket;
    private url = environment.nodeBaseUrl;
    public isSearching = signal(false);
    public selectedLanguage = signal('en');
    public onlineUsers = signal<Set<number>>(new Set());

    constructor(private auth: AuthService) {
        this.socket = io(this.url, { autoConnect: false });

        this.auth.user$.subscribe(user => {
            if (user) {
                this.connect(user.id);
            } else {
                this.disconnect();
            }
        });

        // Listen for user status changes
        this.socket.on('user_status_changed', (data: { userId: any, status: string }) => {
            console.log('Socket: user_status_changed', data);
            const users = new Set(this.onlineUsers());
            const userId = Number(data.userId);

            if (data.status === 'online') {
                users.add(userId);
            } else {
                users.delete(userId);
            }
            this.onlineUsers.set(users);
        });

        // Listen for online users list
        this.socket.on('online_users_list', (userIds: any[]) => {
            console.log('Socket: online_users_list', userIds);
            const numericIds = new Set(userIds.map(id => Number(id)));
            this.onlineUsers.set(numericIds);
        });
    }

    connect(userId: number) {
        if (!this.socket.connected) {
            this.socket.connect();
            this.socket.emit('register', userId);
            // Request current online users
            this.socket.emit('get_online_users');
        }
    }

    disconnect() {
        if (this.socket.connected) {
            this.socket.disconnect();
        }
    }

    findMatch(interests: any[], language: string, filters: any = {}, myProfile: any = {}) {
        this.socket.emit('find_match', { interests, language, filters, myProfile });
    }

    sendChatRequest(targetUserId: number, myProfile: any) {
        this.socket.emit('send_chat_request', { targetUserId, myProfile });
    }

    sendMessage(roomId: string, content: string, originalLang: string, type: string = 'text') {
        this.socket.emit('private_message', { roomId, content, originalLang, type });
    }

    isUserOnline(userId: number): boolean {
        return this.onlineUsers().has(userId);
    }

    checkUserStatus(userId: number): Observable<any> {
        return new Observable(observer => {
            this.socket.emit('check_user_status', userId);
            this.socket.once('user_status_response', (data) => {
                observer.next(data);
                observer.complete();
            });
        });
    }

    onMatchFound(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('match_found', (data) => observer.next(data));
        });
    }

    onMessage(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('message', (data) => observer.next(data));
        });
    }

    onUserStatusChanged(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('user_status_changed', (data) => observer.next(data));
        });
    }

    emitTyping(roomId: string, isTyping: boolean) {
        this.socket.emit('typing', { roomId, isTyping });
    }

    sendTyping(roomId: string) {
        this.emitTyping(roomId, true);
    }

    onUserTyping(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('user_typing', (data) => observer.next(data));
        });
    }

    loadMessages(roomId: string, limit: number = 50, offset: number = 0) {
        this.socket.emit('load_messages', { roomId, limit, offset });
    }

    onMessagesLoaded(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('messages_loaded', (data) => observer.next(data));
        });
    }

    // Chat Request Methods
    acceptChatRequest(requesterSocketId: string) {
        this.socket.emit('accept_chat_request', { requesterSocketId });
    }

    rejectChatRequest(requesterSocketId: string) {
        this.socket.emit('reject_chat_request', { requesterSocketId });
    }

    leaveChat(roomId: string) {
        this.socket.emit('leave_chat', { roomId });
    }

    onRandomUserFound(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('random_user_found', (data) => observer.next(data));
        });
    }

    onChatRequestReceived(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('chat_request_received', (data) => observer.next(data));
        });
    }

    onChatRequestRejected(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('chat_request_rejected', () => observer.next({}));
        });
    }

    onPartnerLeft(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('partner_left', (data) => observer.next(data));
        });
    }

    onNoMatchFound(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('no_match_found', (data) => observer.next(data));
        });
    }


    onWaitingForMatch(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('waiting_for_match', () => observer.next({}));
        });
    }

    onQueueUpdate(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('queue_update', (data) => observer.next(data));
        });
    }

    onMatchRetry(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('match_retry', (data) => observer.next(data));
        });
    }

    submitMatchFeedback(matchId: number, rating: number, feedback: string) {
        this.socket.emit('match_feedback', { matchId, rating, feedback });
    }

    onTranslationResult(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('translation_result', (data) => observer.next(data));
        });
    }

    onMessageRead(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('message_read', (data) => observer.next(data));
        });
    }

    // Generic methods for raw access
    emit(eventName: string, data: any) {
        this.socket.emit(eventName, data);
    }

    on(eventName: string): Observable<any> {
        return new Observable(observer => {
            this.socket.on(eventName, (data) => observer.next(data));
        });
    }
    playNotificationSound() {
        const audio = new Audio('/mp3/notification.wav');
        audio.play().catch(err => console.error('Error playing notification sound:', err));
    }
}
