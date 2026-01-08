import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { shareReplay, takeUntil } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { LanguageService } from './language.service';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SocketService implements OnDestroy {
    private socket: Socket;
    private url = environment.nodeBaseUrl;
    private languageService = inject(LanguageService);
    public isSearching = signal(false);
    public selectedLanguage = this.languageService.currentLang;
    public onlineUsers = signal<Set<number>>(new Set());
    public activeCheckersGame = signal<any>(null);

    private destroy$ = new Subject<void>();

    private matchFoundSubject = new Subject<any>();
    private messageSubject = new Subject<any>();
    private messageSentSubject = new Subject<any>();
    private userStatusChangedSubject = new Subject<any>();
    private userTypingSubject = new Subject<any>();
    private messagesLoadedSubject = new Subject<any>();
    private randomUserFoundSubject = new Subject<any>();
    private chatRequestReceivedSubject = new Subject<any>();
    private chatRequestRejectedSubject = new Subject<any>();
    private partnerLeftSubject = new Subject<any>();
    private noMatchFoundSubject = new Subject<any>();
    private waitingForMatchSubject = new Subject<any>();
    private queueUpdateSubject = new Subject<any>();
    private matchRetrySubject = new Subject<any>();
    private translationResultSubject = new Subject<any>();
    private messageReadSubject = new Subject<any>();
    private checkersInviteSubject = new Subject<any>();
    private checkersStartSubject = new Subject<any>();
    private checkersMoveSubject = new Subject<any>();
    private checkersChatSubject = new Subject<any>();
    private checkersGameOverSubject = new Subject<any>();
    private checkersErrorSubject = new Subject<any>();
    private checkersRejectedSubject = new Subject<any>();

    public matchFound$ = this.matchFoundSubject.asObservable().pipe(shareReplay(1));
    public message$ = this.messageSubject.asObservable().pipe(shareReplay(1));
    public messageSent$ = this.messageSentSubject.asObservable().pipe(shareReplay(1));
    public userStatusChanged$ = this.userStatusChangedSubject.asObservable().pipe(shareReplay(1));
    public userTyping$ = this.userTypingSubject.asObservable().pipe(shareReplay(1));
    public messagesLoaded$ = this.messagesLoadedSubject.asObservable().pipe(shareReplay(1));
    public randomUserFound$ = this.randomUserFoundSubject.asObservable().pipe(shareReplay(1));
    public chatRequestReceived$ = this.chatRequestReceivedSubject.asObservable().pipe(shareReplay(1));
    public chatRequestRejected$ = this.chatRequestRejectedSubject.asObservable();
    public partnerLeft$ = this.partnerLeftSubject.asObservable().pipe(shareReplay(1));
    public noMatchFound$ = this.noMatchFoundSubject.asObservable().pipe(shareReplay(1));
    public waitingForMatch$ = this.waitingForMatchSubject.asObservable().pipe(shareReplay(1));
    public queueUpdate$ = this.queueUpdateSubject.asObservable().pipe(shareReplay(1));
    public matchRetry$ = this.matchRetrySubject.asObservable().pipe(shareReplay(1));
    public translationResult$ = this.translationResultSubject.asObservable().pipe(shareReplay(1));
    public messageRead$ = this.messageReadSubject.asObservable().pipe(shareReplay(1));
    public checkersInvite$ = this.checkersInviteSubject.asObservable();
    public checkersStart$ = this.checkersStartSubject.asObservable();
    public checkersMove$ = this.checkersMoveSubject.asObservable();
    public checkersChat$ = this.checkersChatSubject.asObservable();
    public checkersGameOver$ = this.checkersGameOverSubject.asObservable();
    public checkersError$ = this.checkersErrorSubject.asObservable();
    public checkersRejected$ = this.checkersRejectedSubject.asObservable();

    constructor(private auth: AuthService) {
        this.socket = io(this.url, { autoConnect: false });

        this.auth.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
            if (user) {
                this.connect(user.id);
            } else {
                this.disconnect();
            }
        });

        this.socket.on('user_status_changed', (data: { userId: any, status: string }) => {
            const users = new Set(this.onlineUsers());
            const userId = Number(data.userId);

            if (data.status === 'online') {
                users.add(userId);
            } else {
                users.delete(userId);
            }
            this.onlineUsers.set(users);
            this.userStatusChangedSubject.next(data);
        });

        this.socket.on('online_users_list', (userIds: any[]) => {
            const numericIds = new Set(userIds.map(id => Number(id)));
            this.onlineUsers.set(numericIds);
        });

        this.socket.on('match_found', (data) => this.matchFoundSubject.next(data));
        this.socket.on('message', (data) => this.messageSubject.next(data));
        this.socket.on('message_sent', (data) => this.messageSentSubject.next(data));
        this.socket.on('user_typing', (data) => this.userTypingSubject.next(data));
        this.socket.on('messages_loaded', (data) => this.messagesLoadedSubject.next(data));
        this.socket.on('random_user_found', (data) => this.randomUserFoundSubject.next(data));
        this.socket.on('chat_request_received', (data) => this.chatRequestReceivedSubject.next(data));
        this.socket.on('chat_request_rejected', () => this.chatRequestRejectedSubject.next({}));
        this.socket.on('partner_left', (data) => this.partnerLeftSubject.next(data));
        this.socket.on('no_match_found', (data) => this.noMatchFoundSubject.next(data));
        this.socket.on('waiting_for_match', () => this.waitingForMatchSubject.next({}));
        this.socket.on('queue_update', (data) => this.queueUpdateSubject.next(data));
        this.socket.on('match_retry', (data) => this.matchRetrySubject.next(data));
        this.socket.on('translation_result', (data) => this.translationResultSubject.next(data));
        this.socket.on('message_read', (data) => this.messageReadSubject.next(data));
        this.socket.on('checkers_invite_received', (data) => this.checkersInviteSubject.next(data));
        this.socket.on('checkers_start', (data) => {
            this.activeCheckersGame.set(data);
            this.checkersStartSubject.next(data);
        });
        this.socket.on('checkers_move', (data) => this.checkersMoveSubject.next(data));
        this.socket.on('checkers_chat', (data) => this.checkersChatSubject.next(data));
        this.socket.on('checkers_game_over', (data) => this.checkersGameOverSubject.next(data));
        this.socket.on('checkers_error', (data) => this.checkersErrorSubject.next(data));
        this.socket.on('checkers_rejected', (data) => this.checkersRejectedSubject.next(data));

        this.socket.on('connect', () => {
            const current = this.auth.currentUserValue;
            if (current && current.id) {
                this.socket.emit('register', current.id);
                this.socket.emit('get_online_users');
            }
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.socket.connected) {
            this.socket.disconnect();
        }
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
        this.clearCheckersGame();
    }

    clearCheckersGame() {
        this.activeCheckersGame.set(null);
    }

    findMatch(interests: any[], language: string, filters: any = {}, myProfile: any = {}) {
        const normalizedLang = language === 'tj' ? 'tg' : language;
        this.socket.emit('find_match', { interests, language: normalizedLang, filters, myProfile });
    }

    sendChatRequest(targetUserId: number, myProfile: any) {
        this.socket.emit('send_chat_request', { targetUserId, myProfile });
    }

    sendMessage(roomId: string, content: string, originalLang: string, type: string = 'text', replyTo: any = null) {
        const normalizedLang = originalLang === 'tj' ? 'tg' : originalLang;
        this.socket.emit('private_message', { roomId, content, originalLang: normalizedLang, type, replyTo });
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
        return this.matchFound$;
    }

    onMessage(): Observable<any> {
        return this.message$;
    }

    onMessageSent(): Observable<any> {
        return this.messageSent$;
    }

    onUserStatusChanged(): Observable<any> {
        return this.userStatusChanged$;
    }

    emitTyping(roomId: string, isTyping: boolean) {
        this.socket.emit('typing', { roomId, isTyping });
    }

    sendTyping(roomId: string) {
        this.emitTyping(roomId, true);
    }

    onUserTyping(): Observable<any> {
        return this.userTyping$;
    }

    loadMessages(roomId: string, limit: number = 50, offset: number = 0) {
        this.socket.emit('load_messages', { roomId, limit, offset });
    }

    onMessagesLoaded(): Observable<any> {
        return this.messagesLoaded$;
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
        return this.randomUserFound$;
    }

    onChatRequestReceived(): Observable<any> {
        return this.chatRequestReceived$;
    }

    onChatRequestRejected(): Observable<any> {
        return this.chatRequestRejected$;
    }

    onPartnerLeft(): Observable<any> {
        return this.partnerLeft$;
    }

    onNoMatchFound(): Observable<any> {
        return this.noMatchFound$;
    }

    onWaitingForMatch(): Observable<any> {
        return this.waitingForMatch$;
    }

    onQueueUpdate(): Observable<any> {
        return this.queueUpdate$;
    }

    onMatchRetry(): Observable<any> {
        return this.matchRetry$;
    }

    submitMatchFeedback(matchId: number, rating: number, feedback: string) {
        this.socket.emit('match_feedback', { matchId, rating, feedback });
    }

    onTranslationResult(): Observable<any> {
        return this.translationResult$;
    }

    onMessageRead(): Observable<any> {
        return this.messageRead$;
    }

    // Checkers Methods
    sendCheckersInvite(targetUserId: number, amount: number) {
        this.socket.emit('checkers_invite', { targetUserId, amount });
    }

    acceptCheckersInvite(requesterSocketId: string, amount: number) {
        this.socket.emit('checkers_accept', { requesterSocketId, amount });
    }

    rejectCheckersInvite(requesterSocketId: string) {
        this.socket.emit('checkers_reject', { requesterSocketId });
    }

    sendCheckersMove(roomId: string, move: any) {
        this.socket.emit('checkers_move', { roomId, move });
    }

    sendCheckersChat(roomId: string, message: string) {
        this.socket.emit('checkers_chat', { roomId, message });
    }

    sendCheckersGameOver(roomId: string, winnerId: number) {
        this.socket.emit('checkers_game_over', { roomId, winnerId });
    }

    // Generic methods for raw access
    emit(eventName: string, data: any) {
        if (this.socket.connected) {
            this.socket.emit(eventName, data);
            return;
        }

        // Ensure connection and registration, then emit once connected
        this.socket.connect();
        this.socket.once('connect', () => {
            const current = this.auth.currentUserValue;
            if (current && current.id) {
                this.socket.emit('register', current.id);
            }
            this.socket.emit(eventName, data);
        });
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
