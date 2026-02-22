import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, takeUntil } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { LanguageService } from './language.service';
import { ChatStorageService } from './chat-storage.service'; // Import ChatStorageService
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SocketService implements OnDestroy {
    private socket: Socket;
    private url = environment.nodeBaseUrl;
    private languageService = inject(LanguageService);
    private chatStorage = inject(ChatStorageService); // Inject ChatStorageService
    public isSearching = signal(false);
    public selectedLanguage = this.languageService.currentLang;
    public onlineUsers = signal<Set<number>>(new Set());
    public activeCheckersGame = signal<any>(null);

    private destroy$ = new Subject<void>();

    private matchFoundSubject = new Subject<any>();
    private syncResponseSubject = new Subject<any>();
    private messageSentSubject = new Subject<any>();
    private messageReceivedSubject = new Subject<any>(); // Add this
    private userStatusChangedSubject = new Subject<any>();
    private userTypingSubject = new Subject<any>();
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
    private connectedSubject = new Subject<void>();
    private checkersInviteSubject = new Subject<any>();
    private checkersStartSubject = new Subject<any>();
    private checkersMoveSubject = new Subject<any>();
    private checkersChatSubject = new Subject<any>();
    private checkersGameOverSubject = new Subject<any>();
    private checkersErrorSubject = new Subject<any>();
    private checkersRejectedSubject = new Subject<any>();
    private roomUsersSubject = new Subject<any>(); // New subject for room users

    // Voice Room Subjects
    private voiceRoomJoinedSubject = new Subject<any>();
    private voiceUserJoinedSubject = new Subject<any>();
    private voiceUserLeftSubject = new Subject<any>();
    private voiceChatMessageSubject = new Subject<any>();
    private voiceRoomsListSubject = new Subject<any[]>();
    private connectionStateSubject = new BehaviorSubject<boolean>(false); // New connection state

    public matchFound$ = this.matchFoundSubject.asObservable().pipe(shareReplay(1));
    public messageSent$ = this.messageSentSubject.asObservable().pipe(shareReplay(1));
    public messageReceived$ = this.messageReceivedSubject.asObservable().pipe(shareReplay(1)); // Add this
    public userStatusChanged$ = this.userStatusChangedSubject.asObservable().pipe(shareReplay(1));
    public userTyping$ = this.userTypingSubject.asObservable().pipe(shareReplay(1));
    public randomUserFound$ = this.randomUserFoundSubject.asObservable().pipe(shareReplay(1));
    public chatRequestReceived$ = this.chatRequestReceivedSubject.asObservable().pipe(shareReplay(1));
    public chatRequestRejected$ = this.chatRequestRejectedSubject.asObservable();
    public partnerLeft$ = this.partnerLeftSubject.asObservable();
    public noMatchFound$ = this.noMatchFoundSubject.asObservable().pipe(shareReplay(1));
    public waitingForMatch$ = this.waitingForMatchSubject.asObservable().pipe(shareReplay(1));
    public queueUpdate$ = this.queueUpdateSubject.asObservable().pipe(shareReplay(1));
    public matchRetry$ = this.matchRetrySubject.asObservable().pipe(shareReplay(1));
    public translationResult$ = this.translationResultSubject.asObservable().pipe(shareReplay(1));
    public messageRead$ = this.messageReadSubject.asObservable().pipe(shareReplay(1));
    public connected$ = this.connectedSubject.asObservable();
    public checkersInvite$ = this.checkersInviteSubject.asObservable();
    public checkersStart$ = this.checkersStartSubject.asObservable();
    public checkersMove$ = this.checkersMoveSubject.asObservable();
    public checkersChat$ = this.checkersChatSubject.asObservable();
    public checkersGameOver$ = this.checkersGameOverSubject.asObservable();
    public checkersError$ = this.checkersErrorSubject.asObservable();
    public checkersRejected$ = this.checkersRejectedSubject.asObservable();
    private checkersCancelledSubject = new Subject<any>();
    public checkersCancelled$ = this.checkersCancelledSubject.asObservable();
    public roomUsers$ = this.roomUsersSubject.asObservable();

    // Voice Room Observables
    public voiceRoomJoined$ = this.voiceRoomJoinedSubject.asObservable().pipe(shareReplay(1));
    public voiceUserJoined$ = this.voiceUserJoinedSubject.asObservable().pipe(shareReplay(1));
    public voiceUserLeft$ = this.voiceUserLeftSubject.asObservable().pipe(shareReplay(1));
    public voiceChatMessage$ = this.voiceChatMessageSubject.asObservable().pipe(shareReplay(1));
    public voiceRoomsList$ = this.voiceRoomsListSubject.asObservable();
    public connectionState$ = this.connectionStateSubject.asObservable();
    private voiceErrorSubject = new Subject<any>();
    public voiceError$ = this.voiceErrorSubject.asObservable();

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
        this.socket.on('message', (data) => {
            console.log('[SOCKET] Received message event:', data);
            this.chatStorage.addMessage(data);
            this.messageReceivedSubject.next(data); // Notify subscribers
        });
        this.socket.on('messages_loaded', (data) => {
            console.log('[SOCKET] Received messages_loaded event:', data.messages?.length, 'messages');
            this.chatStorage.addMessagesIfNotExists(data.messages);
        });
        this.socket.on('message_sent', (data) => this.messageSentSubject.next(data));
        this.socket.on('user_typing', (data) => this.userTypingSubject.next(data));
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
        this.socket.on('checkers_move', (data) => {
            console.log('[SOCKET SERVICE] Received checkers_move event:', data);
            this.checkersMoveSubject.next(data);
        });
        this.socket.on('checkers_chat', (data) => this.checkersChatSubject.next(data));
        this.socket.on('checkers_game_over', (data) => this.checkersGameOverSubject.next(data));
        this.socket.on('checkers_error', (data) => this.checkersErrorSubject.next(data));
        this.socket.on('checkers_error', (data) => this.checkersErrorSubject.next(data));
        this.socket.on('checkers_error', (data) => this.checkersErrorSubject.next(data));
        this.socket.on('checkers_rejected', (data) => this.checkersRejectedSubject.next(data));
        this.socket.on('checkers_cancelled', (data) => this.checkersCancelledSubject.next(data));
        this.socket.on('room_users_update', (data) => this.roomUsersSubject.next(data));

        // Voice Room Events
        this.socket.on('voice_room_created', (data) => console.log('Room created:', data));
        this.socket.on('voice_room_joined', (data) => this.voiceRoomJoinedSubject.next(data));
        this.socket.on('voice_user_joined', (data) => this.voiceUserJoinedSubject.next(data));
        this.socket.on('voice_user_left', (data) => this.voiceUserLeftSubject.next(data));
        this.socket.on('voice_chat_message', (data) => this.voiceChatMessageSubject.next(data));
        this.socket.on('voice_rooms_list', (data) => this.voiceRoomsListSubject.next(data));
        this.socket.on('voice_rooms_update', (data) => this.voiceRoomsListSubject.next(data));
        this.socket.on('voice_error', (data) => {
            console.error('Voice Error:', data);
            this.voiceErrorSubject.next(data);
        });
        this.socket.on('voice_room_host_changed', (data) => console.log('Host changed:', data));

        this.socket.on('connect', () => {
            const current = this.auth.currentUserValue;
            if (current && current.id) {
                this.socket.emit('register', current.id);
                this.socket.emit('get_online_users');
            }
            this.connectionStateSubject.next(true);
            this.connectedSubject.next();
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
            this.connectionStateSubject.next(false);
        });
    }

    // Add this method
    translateMessage(messageId: string, text: string, targetLang: string) {
        this.socket.emit('translate_message', { messageId, text, targetLang });
    }

    editMessage(roomId: string, messageId: string, content: string) {
        this.socket.emit('edit_message', { roomId, messageId, content });
    }

    deleteMessage(roomId: string, messageId: string) {
        this.socket.emit('delete_message', { roomId, messageId });
    }

    markMessageRead(messageId: string, roomId: string) {
        // Extract partner ID from roomId (format: room_ID1_ID2)
        // Backend expects roomId and senderId (the partner's user ID)
        const currentUserId = this.auth.currentUserValue?.id;
        if (!currentUserId || !roomId) return;

        const parts = roomId.split('_');
        if (parts.length === 3) {
            const id1 = parseInt(parts[1]);
            const id2 = parseInt(parts[2]);
            const senderId = (id1 === currentUserId) ? id2 : id1;

            this.socket.emit('mark_as_read', { roomId, senderId });
        }
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
            this.chatStorage.openDb(userId).then(() => {
                this.socket.connect();
                this.socket.emit('register', userId);
                // Request current online users
                this.socket.emit('get_online_users');
            });
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

    sendMessage(roomId: string, content: string, originalLang: string, type: string = 'text', replyTo: any = null, tempId?: string, senderName: string | null = null, avatar: string | null = null) {
        const normalizedLang = originalLang === 'tj' ? 'tg' : originalLang;
        const currentUser = this.auth.currentUserValue;
        const finalSenderName = senderName || currentUser?.name;
        const finalAvatar = avatar || currentUser?.avatar;

        this.socket.emit('private_message', {
            roomId,
            content,
            originalLang: normalizedLang,
            type,
            replyTo,
            tempId,
            senderName: finalSenderName,
            avatar: finalAvatar
        });
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

    syncMessages(roomId: string, lastMessageId: string | null) {
        this.socket.emit('sync_messages', { roomId, lastMessageId });
    }

    onSyncResponse(): Observable<any> {
        return this.syncResponseSubject.asObservable();
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

    cancelCheckersInvite(targetUserId: number) {
        this.socket.emit('checkers_cancel', { targetUserId });
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

    // Voice Room Methods
    getVoiceRooms() {
        this.socket.emit('get_voice_rooms');
    }

    createVoiceRoom(topic: string) {
        this.socket.emit('create_voice_room', { topic });
    }

    joinVoiceRoom(roomId: string, profile?: { name: string, avatar: string }) {
        this.socket.emit('join_voice_room', { roomId, profile });
    }

    leaveVoiceRoom(roomId: string) {
        this.socket.emit('leave_voice_room', { roomId });
    }

    sendVoiceRoomMessage(roomId: string, content: string, senderName?: string, avatar?: string) {
        this.socket.emit('voice_room_message', { roomId, content, senderName, avatar });
    }

    // Generic methods for raw access
    emit(eventName: string, data: any) {
        if (this.socket.connected) {
            this.socket.emit(eventName, data);
            return;
        }

        // Ensure connection and registration, then emit once connected
        this.socket.connect();
        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.connectionStateSubject.next(true);
            const current = this.auth.currentUserValue;
            if (current && current.id) {
                this.socket.emit('register', current.id);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
            this.connectionStateSubject.next(false);
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