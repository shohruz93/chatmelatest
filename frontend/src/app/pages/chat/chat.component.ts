import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { LanguageService } from '../../services/language.service';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CountryService } from '../../services/country.service';
import { TimestampService } from '../../services/timestamp.service';
import { ChatStorageService } from '../../services/chat-storage.service';
import { Subscription, lastValueFrom } from 'rxjs';
import { VoiceRecorder, RecordingData } from '@independo/capacitor-voice-recorder';

import { TranslationService } from '../../services/translation.service';
import { CountrySelectComponent } from '../../components/country-select/country-select.component';
import { UserProfileModalComponent } from '../../components/user-profile-modal/user-profile-modal.component';
import { ImageModalComponent } from '../../components/image-modal/image-modal.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, CountrySelectComponent, ImageModalComponent, UserProfileModalComponent, TranslatePipe],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css', './chat-messages.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messagesContainer') private scrollContainer!: ElementRef;

    public socketService = inject(SocketService);
    private auth = inject(AuthService);
    private route = inject(ActivatedRoute);
    private translationService = inject(TranslationService);
    private api = inject(ApiService);
    private countryService = inject(CountryService);
    private timestampService = inject(TimestampService);
    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);
    private languageService = inject(LanguageService);
    private chatStorage = inject(ChatStorageService); // Inject ChatStorageService

    messages: any[] = [];
    newMessage: string = '';
    pendingMessages: string[] = [];
    roomId: string | null = null;
    currentUser: any;
    partnerTyping: boolean = false;
    private typingTimeout: any;
    waitingForResponse = false;
    isSyncing = signal(false);
    isOnline = signal(navigator.onLine);

    // Modal states
    showPartnerLeftBanner = false;
    partnerStatus: 'online' | 'offline' = 'online';
    showPartnerProfileModal = false;
    showImageModal = false;
    selectedImageUrl = '';

    // Media & Stickers
    showMediaMenu = false;
    showStickerPicker = false;
    isRecording = false;
    showRecordingTimer = false;
    mediaRecorder: MediaRecorder | null = null;
    audioChunks: any[] = [];
    recordingDuration = 0;
    recordingTimer: any;
    timerShowDelay: any;

    stickers = [
        '😀', '😂', '😍', '😎', '😭', '😡', '👍', '👎', '🎉', '❤️', '🔥', '💩',
        '👻', '👽', '🤖', '🎃', '🎄', '🎁', '🎈', '💪', '🙏', '🤝', '👋', '💋',
        '💯', '💢', '💥', '💫', '💦', '💤', '💭', '🥳', '🥺', '🤯', '🥴', '🥰',
        '🤩', '🤪', '🤫', '🤬', '🤭', '🤮', '🤧', '🥶', '🥵', '🤑', '🤠', '🤡',
        '😈', '👿', '👹', '👺', '💀', '☠️', '😼', '😽', '🙀', '😿', '😾', '🙈',
        '🙉', '🙊', '🐵', '🐶', '🐺', '🐱', '🦁', '🐯', '🦒', '🦊', '🦝', '🐮',
        '🐷', '🐗', '🐭', '🐹', '🐰', '🐻', '🐨', '🐼', '🐸', '🦓', '🐴', '🦄'
    ];

    isDarkMode = signal(document.documentElement.getAttribute('data-theme') === 'dark');

    partner: any = null;
    selectedImage: string | null = null;

    get partnerId() { return this.partner?.id; }
    get partnerName() { return this.partner?.display_name || this.partner?.username || this.partner?.name; }
    get partnerAvatar() { return this.partner?.avatar; }
    get isPartnerOnline() { return this.partnerStatus === 'online'; }
    get isPartnerTyping() { return this.partnerTyping; }

    private matchSub!: Subscription;
    private messageSentSub!: Subscription;
    private storageSub!: Subscription;
    private typingSub!: Subscription;
    private partnerLeftSub!: Subscription;
    private randomUserSub!: Subscription;
    private roomDetailsSub!: Subscription;
    private statusSub!: Subscription;
    private requestSub!: Subscription;
    private editSub!: Subscription;
    private deleteSub!: Subscription;
    private gameInviteSub!: Subscription;
    private gameStartSub!: Subscription;
    private gameRejectedSub!: Subscription;
    private paramMapSub!: Subscription;

    // Filter modal
    showFilterModal = false;
    filterGender: string = 'any';
    filterLocation: string = 'any';
    filterOnlineOnly: boolean = false;

    genderOptions = [
        { value: 'any', label: 'CHAT.ANY_GENDER' },
        { value: 'male', label: 'CHAT.MALE' },
        { value: 'female', label: 'CHAT.FEMALE' }
    ];

    locationOptions: any[] = [];

    // Incoming Request Modal
    // Found User Modal
    foundUser: any = null;
    isSendingRequest: boolean = false;

    // Incoming Request Modal
    incomingRequest: any = null;

    // Edit/Reply state
    editingMessage: any = null;
    replyingToMessage: any = null;

    // Game invitation state
    gameInvitation: any = null;

    // Advanced matching features
    queuePosition: number = 0;
    totalWaiting: number = 0;
    estimatedWaitTime: number = 0;
    compatibilityScore: number = 0;
    matchReasons: string[] = [];
    compatibilityBreakdown: any = null;
    retryMessage: string = '';
    currentMatchId: number | null = null;



    async ngOnInit() {
        this.locationOptions = this.countryService.getCountryOptions();
        // Initialize current user from localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.currentUser = JSON.parse(userStr);
            await this.chatStorage.openDb(this.currentUser.id); // Ensure DB is open

            // Clean up old temporary messages
            await this.chatStorage.cleanupOldTempMessages();
        } else {
            console.error('No user found in localStorage');
            // Redirect to login or handle appropriately
        }

        // *** NEW: Subscribe to storage updates ***
        this.storageSub = this.chatStorage.messagesUpdated$.subscribe(() => {
            if (this.roomId) {
                this.loadMessagesFromStorage(this.roomId);
            }
        });

        // Listen for incoming chat requests
        this.requestSub = this.socketService.onChatRequestReceived().subscribe(data => {
            this.incomingRequest = data;
        });

        // Listen for user status changes
        this.statusSub = this.socketService.onUserStatusChanged().subscribe(data => {
            if (this.partner && Number(data.userId) === Number(this.partner.id)) {
                this.partnerStatus = data.status as 'online' | 'offline';
                if (data.status === 'offline' && data.lastSeen) {
                    this.partner.last_active = data.lastSeen;
                }
            }
        });

        this.socketService.onChatRequestRejected().subscribe(() => {
            this.waitingForResponse = false;
            this.partner = null;
            this.retryMessage = 'Request rejected. Try finding someone else.';
            this.startSearch();
        });

        // Listen for queue updates
        this.socketService.onQueueUpdate().subscribe(data => {
            this.queuePosition = data.position;
            this.totalWaiting = data.totalWaiting;
            this.estimatedWaitTime = data.estimatedWaitTime;
        });

        // Listen for match retry
        this.socketService.onMatchRetry().subscribe(data => {
            this.retryMessage = data.message;
            setTimeout(() => {
                this.retryMessage = '';
            }, 5000);
        });

        // Check for partner ID in route (resuming conversation)
        this.paramMapSub = this.route.paramMap.subscribe(async params => {
            const partnerId = params.get('userId');
            if (partnerId) {
                const pId = parseInt(partnerId);
                if (!isNaN(pId)) {
                    const sortedIds = [this.currentUser.id, pId].sort((a, b) => a - b);
                    this.roomId = `room_${sortedIds[0]}_${sortedIds[1]}`;

                    // Join the chat room
                    this.socketService.emit('join_chat', { roomId: this.roomId });

                    // Try to load partner info from storage first
                    const cachedPartner = await this.chatStorage.getPartnerInfo(this.roomId);
                    if (cachedPartner) {
                        console.log('[CHAT] Loaded partner from cache:', cachedPartner);
                        this.partner = cachedPartner;
                        this.partnerStatus = this.socketService.isUserOnline(cachedPartner.id) ? 'online' : 'offline';
                    }

                    // Load messages and partner details
                    console.log('[CHAT] Loading messages for room:', this.roomId);
                    this.loadMessagesFromStorage(this.roomId!, true); // Load from local
                    this.syncMessages(); // Sync with server
                    // Set partner initial status correctly
                    this.socketService.emit('get_room_details', { roomId: this.roomId });
                }
            }
        });

        this.matchSub = this.socketService.onMatchFound().subscribe(data => {
            this.roomId = data.roomId;
            this.waitingForResponse = false;
            this.socketService.isSearching.set(false);
            this.foundUser = null; // Close found user modal if open

            // Store match quality data
            this.compatibilityScore = data.compatibilityScore || 0;
            this.matchReasons = data.matchReasons || [];
            this.compatibilityBreakdown = data.breakdown || null;

            const matchMsg = {
                id: `sys_${Date.now()}`,
                type: 'system',
                roomId: this.roomId,
                content: this.compatibilityScore > 0
                    ? `Match found! Compatibility: ${this.compatibilityScore.toFixed(0)}%`
                    : 'Match found! Say hello.'
            };
            this.chatStorage.addMessage(matchMsg);


            this.loadMessagesFromStorage(this.roomId!);
            this.syncMessages();


            // Send any pending messages
            if (this.pendingMessages.length > 0) {
                this.pendingMessages.forEach(content => {
                    this.socketService.sendMessage(this.roomId!, content, this.socketService.selectedLanguage());
                });
                this.pendingMessages = [];
            }

            // Fetch partner details
            this.socketService.emit('get_room_details', { roomId: this.roomId });
        });

        this.roomDetailsSub = this.socketService.on('room_details').subscribe(async (data: any) => {
            if (data.roomId === this.roomId) {
                // Fix: Use string comparison to ensure we don't pick the current user if types differ
                const partnerProfile = data.participants.find((p: any) => String(p.id) !== String(this.currentUser.id));
                if (partnerProfile) {
                    // Parse interests if they're objects
                    if (partnerProfile.interests && Array.isArray(partnerProfile.interests)) {
                        partnerProfile.interests = partnerProfile.interests.map((interest: any) => {
                            // If interest is an object with 'name' property, extract just the name
                            return typeof interest === 'object' && interest.name ? interest.name : interest;
                        });
                    }

                    // Normalize avatar URL
                    if (partnerProfile.avatar && !partnerProfile.avatar.startsWith('http')) {
                        partnerProfile.avatar = `${this.api.phpBaseUrl}${partnerProfile.avatar}`;
                    }

                    this.partner = partnerProfile;
                    console.log('[CHAT] Received partner details:', partnerProfile);

                    // Save partner info to storage for future use
                    await this.chatStorage.savePartnerInfo(this.roomId!, partnerProfile);

                    // Set partner initial status correctly
                    this.partnerStatus = this.socketService.isUserOnline(partnerProfile.id) ? 'online' : 'offline';
                }
            }
        });

        // Listen for server ack that message was saved (sent)
        this.messageSentSub = this.socketService.onMessageSent().subscribe(async (messageData: any) => {
            if (messageData.roomId !== this.roomId) return;

            const tempId = messageData.tempId;
            if (!tempId) return;

            // Replace temp message with real message from server
            const finalMessage = {
                id: messageData.id,
                sender_id: messageData.senderId,
                roomId: messageData.roomId,
                content: messageData.content,
                created_at: messageData.timestamp * 1000, // Convert to milliseconds
                messageType: messageData.type || 'text',
                status: 'sent',
                replyTo: messageData.replyTo,
                originalLang: messageData.originalLang,
                type: 'sent'
            };

            await this.chatStorage.replaceTempMessage(tempId, finalMessage);
        });

        this.typingSub = this.socketService.onUserTyping().subscribe((data: any) => {
            this.partnerTyping = data.isTyping;
            this.cdr.markForCheck();

            if (this.partnerTyping && this.isUserNearBottom()) {
                this.scrollToBottom();
            }

            if (this.partnerTyping) {
                setTimeout(() => {
                    this.partnerTyping = false;
                    this.cdr.markForCheck();
                }, 3000);
            }
        });

        // Listen for partner leaving
        this.partnerLeftSub = this.socketService.onPartnerLeft().subscribe((data) => {
            this.showPartnerLeftBanner = true;
            const systemMessage = { type: 'system', content: 'Partner has left the chat.', roomId: this.roomId, id: `sys_${Date.now()}` };
            this.chatStorage.addMessage(systemMessage);
            this.partnerStatus = 'offline';
            this.cdr.markForCheck();
        });

        // Listen for random user found
        this.randomUserSub = this.socketService.onRandomUserFound().subscribe(data => {
            this.socketService.isSearching.set(false);
            if (data.user) {
                // Parse languages if they are strings
                if (typeof data.user.native_language === 'string') {
                    data.user.native_language = data.user.native_language.split(',').filter((l: string) => l);
                }
                if (typeof data.user.learning_language === 'string') {
                    data.user.learning_language = data.user.learning_language.split(',').filter((l: string) => l);
                }

                // Normalize avatar
                if (data.user.avatar && !data.user.avatar.startsWith('http')) {
                    data.user.avatar = `${this.api.phpBaseUrl}${data.user.avatar}`;
                }

                this.foundUser = data.user;
                this.foundUser.isOnline = data.isOnline;
                this.foundUser.compatibilityScore = data.compatibilityScore || 0;
                this.foundUser.matchReasons = data.matchReasons || [];
                this.foundUser.breakdown = data.breakdown || null;
            }
        });

        // Listen for message read receipts
        this.socketService.onMessageRead().subscribe(async (data: any) => {
            if (data.roomId === this.roomId) {
                const messagesToUpdate = this.messages.filter(msg => msg.type === 'sent' && msg.status !== 'read');
                for (const msg of messagesToUpdate) {
                    msg.read = true;
                    msg.status = 'read';
                    await this.chatStorage.updateMessage(msg);
                }
            }
        });

        // Listen for translation results globally
        this.socketService.onTranslationResult().subscribe((data: any) => {
            const message = this.messages.find(m => m.id === data.messageId);
            if (message) {
                if (data.success) {
                    message.translatedContent = data.translatedText;
                    message.showTranslation = true;
                } else {
                    console.error('Translation failed:', data.error);
                    // Optionally show error state on message
                }
                message.isTranslating = false;
            }
        });

        // Listen for message edits
        this.editSub = this.socketService.on('message_edited').subscribe((data: any) => {
            const message = this.messages.find(m => m.id === data.messageId);
            if (message) {
                message.content = data.content;
                // Reset translation if it was edited
                message.translatedContent = null;
                message.showTranslation = false;
            }
        });

        // Listen for message deletions
        this.deleteSub = this.socketService.on('message_deleted').subscribe((data: any) => {
            this.messages = this.messages.filter(m => m.id !== data.messageId);
        });

        // Listen for game invitations
        this.gameInviteSub = this.socketService.checkersInvite$.subscribe(invite => {
            this.gameInvitation = invite;
            this.socketService.playNotificationSound();
            this.cdr.markForCheck();
        });

        this.gameStartSub = this.socketService.checkersStart$.subscribe(data => {
            // Redirect to checkers game
            this.router.navigate(['/dashboard/games/checkers']);
        });

        this.gameRejectedSub = this.socketService.checkersRejected$.subscribe(data => {
            if (this.gameInvitation && this.gameInvitation.fromUserId === data.byUserId) {
                this.gameInvitation = null;
            }
            this.cdr.markForCheck();
        });

        // Online/offline detection
        window.addEventListener('online', async () => {
            this.isOnline.set(true);
            console.log('Back online - retrying pending messages');

            // Retry pending messages
            if (this.roomId) {
                const pendingMessages = await this.chatStorage.getPendingMessages(this.roomId);
                for (const msg of pendingMessages) {
                    this.socketService.sendMessage(
                        msg.roomId,
                        msg.content,
                        msg.originalLang || this.socketService.selectedLanguage(),
                        msg.messageType || 'text',
                        msg.replyTo,
                        msg.id // Use the existing temp ID
                    );
                }
            }
        });

        window.addEventListener('offline', () => {
            this.isOnline.set(false);
            console.log('Gone offline');
        });
    }

    sendRequest() {
        if (!this.foundUser) {
            return;
        }

        this.isSendingRequest = true;

        const myProfile = {
            name: this.currentUser.name,
            avatar: this.currentUser.avatar,
            gender: this.currentUser.gender,
            location: this.currentUser.location
        };

        this.socketService.sendChatRequest(this.foundUser.id, myProfile);

        // Immediate transition to waiting state
        this.waitingForResponse = true;
        this.partner = this.foundUser;
        this.partnerStatus = 'online';
        this.foundUser = null;
        this.isSendingRequest = false;
    }

    skipUser() {
        this.foundUser = null;
        // Restart search
        this.startSearch();
    }

    acceptRequest() {
        if (!this.incomingRequest) return;
        this.socketService.acceptChatRequest(this.incomingRequest.socketId);
        this.incomingRequest = null;
    }

    rejectRequest() {
        if (!this.incomingRequest) return;
        this.socketService.rejectChatRequest(this.incomingRequest.socketId);
        this.incomingRequest = null;
    }

    // Infinite Scroll
    isLoadingMore = false;
    isLoadingHistory = false;
    allMessagesLoaded = false;
    private scrollOffset = 0;

    // Memoization for grouped messages
    private cachedGroupedMessages: any[] = [];
    private lastMessagesRef: any[] | null = null;

    ngOnDestroy() {
        if (this.matchSub) this.matchSub.unsubscribe();
        if (this.messageSentSub) this.messageSentSub.unsubscribe();
        if (this.storageSub) this.storageSub.unsubscribe();
        if (this.typingSub) this.typingSub.unsubscribe();
        if (this.partnerLeftSub) this.partnerLeftSub.unsubscribe();
        if (this.randomUserSub) this.randomUserSub.unsubscribe();
        if (this.roomDetailsSub) this.roomDetailsSub.unsubscribe();
        if (this.statusSub) this.statusSub.unsubscribe();
        if (this.requestSub) this.requestSub.unsubscribe();
        if (this.editSub) this.editSub.unsubscribe();
        if (this.deleteSub) this.deleteSub.unsubscribe();
        if (this.gameInviteSub) this.gameInviteSub.unsubscribe();
        if (this.gameStartSub) this.gameStartSub.unsubscribe();
        if (this.gameRejectedSub) this.gameRejectedSub.unsubscribe();
        if (this.paramMapSub) this.paramMapSub.unsubscribe();

        if (this.roomId) {
            this.socketService.emitTyping(this.roomId, false);
        }
    }

    ngAfterViewChecked() {
        // Removed aggressive auto-scroll
    }

    private mapMessage(msg: any): any {
        let timestamp = msg.created_at || msg.timestamp;
        if (typeof timestamp === 'number' && timestamp < 10000000000) {
            timestamp *= 1000;
        }
        return {
            id: msg.id,
            type: msg.type || (String(msg.sender_id) === String(this.currentUser.id) ? 'sent' : 'received'),
            content: msg.content,
            created_at: timestamp,
            messageType: this.detectMessageType(msg.content, msg.messageType),
            read: (msg.is_read !== undefined) ? Boolean(msg.is_read) : (msg.read || false),
            status: msg.status || ((msg.is_read !== undefined ? msg.is_read : msg.read) ? 'read' : 'sent'),
            replyTo: msg.replyTo,
            originalLang: msg.original_lang,
            senderName: msg.senderName
        };
    }

    get groupedMessages() {
        console.log('[CHAT] groupedMessages called, messages.length:', this.messages?.length);
        if (!this.messages || this.messages.length === 0) return [];

        if (this.messages === this.lastMessagesRef && this.cachedGroupedMessages.length > 0) {
            return this.cachedGroupedMessages;
        }

        const sortedMessages = [...this.messages].sort((a, b) => {
            const dateA = this.getValidDate(a.created_at)?.getTime() || 0;
            const dateB = this.getValidDate(b.created_at)?.getTime() || 0;
            return dateA - dateB;
        });

        const groups: { date: string, messages: any[] }[] = [];
        let lastDate: string | null = null;

        sortedMessages.forEach(msg => {
            const date = this.getValidDate(msg.created_at);
            const dateStr = date
                ? date.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
                : 'Invalid Date';

            if (dateStr !== lastDate) {
                groups.push({ date: dateStr, messages: [msg] });
                lastDate = dateStr;
            } else {
                groups[groups.length - 1].messages.push(msg);
            }
        });

        this.lastMessagesRef = this.messages;
        this.cachedGroupedMessages = groups;
        return groups;
    }

    private getValidDate(timestamp: any): Date | null {
        if (typeof timestamp === 'number') {
            let date: Date;
            if (timestamp < 10000000000) {
                date = new Date(timestamp * 1000);
            } else {
                date = new Date(timestamp);
            }
            return isNaN(date.getTime()) ? null : date;
        }
        if (timestamp instanceof Date) {
            return isNaN(timestamp.getTime()) ? null : timestamp;
        }
        return null;
    }

    formatMessageTime(timestamp: any): string {
        const date = this.getValidDate(timestamp);
        if (!date) {
            return 'Invalid Date';
        }
        try {
            return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return 'Invalid Date';
        }
    }

    // *** NEW: Load messages from local storage ***
    async loadMessagesFromStorage(roomId: string, scrollToBottom = false) {
        console.log('[CHAT] loadMessagesFromStorage called for room:', roomId);
        this.isLoadingHistory = true;
        const localMessages = await this.chatStorage.getMessages(roomId, 50, 0);
        console.log('[CHAT] Loaded', localMessages.length, 'messages from IndexedDB:', localMessages);

        // Handle message mapping and sorting
        const mappedMessages = localMessages.map(this.mapMessage.bind(this));
        console.log('[CHAT] Mapped', mappedMessages.length, 'messages:', mappedMessages);

        // Keep track of pending messages to avoid duplicates when they are confirmed
        this.messages = mappedMessages;
        console.log('[CHAT] Set this.messages to', this.messages.length, 'messages');

        this.isLoadingHistory = false;
        this.allMessagesLoaded = localMessages.length < 50;
        this.cdr.markForCheck();

        if (scrollToBottom) {
            this.scrollToBottom('auto');
        }

        this.markMessagesAsRead();
    }

    // *** NEW: Sync messages with server ***
    async syncMessages() {
        if (!this.roomId) return;

        // We could use the last message timestamp to fetch only new ones
        // For now, let's just load the latest page to ensure consistency
        this.socketService.loadMessages(this.roomId, 50, 0);

        await this.chatStorage.setLastSyncTimestamp(this.roomId, Date.now());
    }

    // *** REFACTORED: Now loads from local storage ***
    async loadMoreMessages() {
        if (!this.roomId || this.isLoadingMore || this.allMessagesLoaded) return;

        this.isLoadingMore = true;
        const currentScrollHeight = this.scrollContainer.nativeElement.scrollHeight;
        const offset = this.messages.filter(m => m.status !== 'sending').length;

        const newMessages = await this.chatStorage.getMessages(this.roomId, 30, offset);

        if (newMessages.length === 0) {
            this.allMessagesLoaded = true;
        } else {
            const mappedMessages = newMessages.map(this.mapMessage.bind(this));

            // Avoid duplicates
            const existingIds = new Set(this.messages.map(m => m.id));
            const uniqueNewMessages = mappedMessages.filter(m => !existingIds.has(m.id));

            this.messages = [...uniqueNewMessages, ...this.messages];

            // Restore scroll position
            setTimeout(() => {
                if (this.scrollContainer) {
                    const newScrollHeight = this.scrollContainer.nativeElement.scrollHeight;
                    this.scrollContainer.nativeElement.scrollTop = newScrollHeight - currentScrollHeight;
                }
            }, 0);
        }

        this.isLoadingMore = false;
        this.cdr.markForCheck();
    }

    // *** REFACTORED: Saves to local storage first ***
    async sendMessage() {
        if (!this.newMessage.trim() || (!this.roomId && !this.waitingForResponse)) {
            return;
        }

        const content = this.newMessage;

        if (this.editingMessage) {
            // Handle edit logic (unchanged for now, but should also update storage)
            this.socketService.emit('edit_message', { roomId: this.roomId, messageId: this.editingMessage.id, content });
            this.cancelInputMode();
            this.newMessage = '';
            return;
        }

        const replyTo = this.replyingToMessage ? {
            id: this.replyingToMessage.id,
            content: this.replyingToMessage.content,
            senderName: this.replyingToMessage.senderName || 'Partner'
        } : null;

        const tempId = `temp_${Date.now()}`;
        const messageObj = {
            id: tempId,
            roomId: this.roomId,
            sender_id: this.currentUser.id,
            content: content,
            created_at: new Date().getTime(),
            messageType: 'text',
            status: 'sending',
            replyTo: replyTo,
            senderName: this.currentUser.name
        };

        // Immediately save to local storage
        await this.chatStorage.addMessage(messageObj);

        // UI will update automatically via the `messagesUpdated$` subscription

        if (this.roomId) {
            // Pass tempId to the server so it can be returned for confirmation
            this.socketService.sendMessage(this.roomId, content, this.socketService.selectedLanguage(), 'text', replyTo, tempId);
        } else if (this.waitingForResponse) {
            this.pendingMessages.push(content);
        }

        this.newMessage = '';
        this.cancelInputMode();
        if (this.roomId) this.socketService.emitTyping(this.roomId, false);
        if (this.typingTimeout) clearTimeout(this.typingTimeout);

        this.scrollToBottom();
    }


    replyToMessage(msg: any) {
        this.replyingToMessage = {
            id: msg.id,
            content: msg.content,
            senderName: msg.senderName || this.partnerName || 'Partner'
        };
        this.editingMessage = null;
    }

    private isUserNearBottom(): boolean {
        if (!this.scrollContainer) return false;
        const element = this.scrollContainer.nativeElement;
        const threshold = 150; // pixels from bottom
        const position = element.scrollTop + element.offsetHeight;
        const height = element.scrollHeight;
        return position > height - threshold;
    }

    scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
        setTimeout(() => {
            try {
                if (this.scrollContainer) {
                    this.scrollContainer.nativeElement.scrollTo({
                        top: this.scrollContainer.nativeElement.scrollHeight,
                        behavior: behavior
                    });
                }
            } catch (err) {
                console.error('Scroll error:', err);
            }
        }, 100);
    }


    onScroll(event: any) {
        const element = event.target;
        if (element.scrollTop === 0 && !this.isLoadingMore && !this.allMessagesLoaded) {
            this.loadMoreMessages();
        }
    }

    markMessagesAsRead() {
        if (this.roomId && this.partner) {
            this.socketService.emit('mark_as_read', {
                roomId: this.roomId,
                senderId: this.partner.id
            });
        } else if (this.roomId) {
            // Try to extract partner ID from room ID if partner object isn't fully loaded yet
            const parts = this.roomId.split('_');
            if (parts.length === 3) {
                const id1 = parseInt(parts[1]);
                const id2 = parseInt(parts[2]);
                const partnerId = (id1 === this.currentUser.id) ? id2 : id1;
                this.socketService.emit('mark_as_read', {
                    roomId: this.roomId,
                    senderId: partnerId
                });
            }
        }
    }

    onInputChange() {
        if (!this.roomId) return;

        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        this.socketService.emitTyping(this.roomId, true);

        this.typingTimeout = setTimeout(() => {
            this.socketService.emitTyping(this.roomId!, false);
        }, 2000);
    }

    editMessage(msg: any) {
        this.editingMessage = msg;
        this.replyingToMessage = null;
        this.newMessage = msg.content;
        // Focus input
        // this.messageInput.nativeElement.focus();
    }

    async deleteMessage(msg: any) {
        if (confirm('Are you sure you want to delete this message?')) {
            this.socketService.emit('delete_message', {
                roomId: this.roomId,
                messageId: msg.id
            });
            // Instantly remove from UI and storage
            await this.chatStorage.deleteMessage(msg.id);
        }
    }

    cancelInputMode() {
        if (this.editingMessage) {
            this.newMessage = '';
        }
        this.editingMessage = null;
        this.replyingToMessage = null;
    }

    translateMessage(msg: any) {
        if (msg.translatedContent) {
            msg.showTranslation = !msg.showTranslation;
            return;
        }

        // Ensure we have an ID
        if (!msg.id) {
            console.error('Message has no ID, assigning temp ID');
            msg.id = Date.now();
        }

        msg.isTranslating = true;

        // Determine target language from SocketService selectedLanguage
        let targetLang = this.socketService.selectedLanguage();
        if (targetLang === 'tj') targetLang = 'tg';

        // Request translation from socket server
        this.socketService.emit('translate_message', {
            messageId: msg.id,
            text: msg.content,
            targetLang
        });
    }

    toggleTheme() {
        const newTheme = this.isDarkMode() ? 'light' : 'dark';
        this.isDarkMode.set(!this.isDarkMode());
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    leaveChat() {
        if (this.roomId) {
            this.socketService.leaveChat(this.roomId);
            this.roomId = null;
            this.messages = [];
            this.showPartnerLeftBanner = false;
        }
    }

    dismissPartnerLeftBanner() {
        this.showPartnerLeftBanner = false;
    }

    openPartnerProfile() {
        if (this.partner) {
            this.showPartnerProfileModal = true;
        }
    }

    getTranslation(key: string, params: any = null): string {
        return this.languageService.translate(key, params);
    }

    sendGameInvite() {
        if (!this.partnerId) return;
        if (!this.isPartnerOnline) {
            alert(this.getTranslation('CHAT.USER_OFFLINE'));
            return;
        }
        // Default bet amount 50
        this.socketService.sendCheckersInvite(this.partnerId, 50);
        const systemMessage = { type: 'system', content: 'You invited partner to a game of Checkers (50 🪙)', roomId: this.roomId, id: `sys_${Date.now()}` };
        this.chatStorage.addMessage(systemMessage);
        this.cdr.markForCheck();
    }

    acceptGameInvite() {
        if (!this.gameInvitation) return;
        this.socketService.acceptCheckersInvite(this.gameInvitation.socketId, this.gameInvitation.amount);
        this.gameInvitation = null;
        this.cdr.markForCheck();
    }

    rejectGameInvite() {
        if (!this.gameInvitation) return;
        this.socketService.rejectCheckersInvite(this.gameInvitation.socketId);
        this.gameInvitation = null;
        this.cdr.markForCheck();
    }

    // Filter modal methods
    findMatch() {
        if (this.socketService.isSearching()) return;
        this.showFilterModal = true;
    }

    closeFilterModal() {
        this.showFilterModal = false;
    }

    startSearch() {
        this.showFilterModal = false;
        this.socketService.isSearching.set(true);

        const filters = {
            gender: this.filterGender,
            location: this.filterLocation,
            onlineOnly: this.filterOnlineOnly
        };

        const myProfile = {
            gender: (this.currentUser as any)?.gender || '',
            location: (this.currentUser as any)?.location || ''
        };

        this.socketService.findMatch(
            this.currentUser?.interests || [],
            this.socketService.selectedLanguage(),
            filters,
            myProfile
        );

        setTimeout(() => {
            this.socketService.isSearching.set(false);
        }, 30000);
    }

    // Media Methods
    // Media Methods
    triggerFileInput() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/png, image/jpeg, image/gif';
        fileInput.onchange = (e: any) => this.onImageSelected(e);
        fileInput.click();
    }

    onImageSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            const fileType = file.type;
            if (fileType !== 'image/png' && fileType !== 'image/jpeg' && fileType !== 'image/gif') {
                console.error('Invalid file type. Please select a PNG, JPG, or GIF file.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e: any) => {
                const imageData = e.target.result;
                this.sendMediaMessage(imageData, 'image');
            };
            reader.readAsDataURL(file);
        }
    }

    toggleMediaMenu() {
        this.showMediaMenu = !this.showMediaMenu;
    }

    toggleStickerPicker() {
        this.showStickerPicker = !this.showStickerPicker;
    }

    sendSticker(sticker: string) {
        this.newMessage += sticker;
        // this.showStickerPicker = false; // Keep open for multiple stickers
        this.onInputChange(); // Trigger typing indicator or other input logic if needed
    }

    onTyping() {
        // Delegate to onInputChange for proper debounced typing indicator
        this.onInputChange();
    }

    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    async startRecording() {
        this.isRecording = true;
        this.showRecordingTimer = true;
        this.recordingDuration = 0;

        // Start timer immediately for UI responsiveness
        this.recordingTimer = setInterval(() => {
            this.recordingDuration++;
        }, 1000);

        try {
            const permission = await VoiceRecorder.requestAudioRecordingPermission();
            if (permission.value) {
                await VoiceRecorder.startRecording();
            } else {
                this.cleanupRecording();
                alert('Microphone permission was denied. Please enable microphone access for this app in the device settings.');
            }
        } catch (error) {
            this.cleanupRecording();
            console.error('Microphone access error', error);
            alert('Unable to access microphone: ' + error);
        }
    }

    private cleanupRecording() {
        this.isRecording = false;
        this.showRecordingTimer = false;
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    async stopRecording() {
        if (this.isRecording) {
            try {
                const result: RecordingData = await VoiceRecorder.stopRecording();
                if (result.value && result.value.recordDataBase64) {
                    const mimeType = result.value.mimeType || 'audio/aac';
                    const audioData = `data:${mimeType};base64,${result.value.recordDataBase64}`;
                    this.sendMediaMessage(audioData, 'voice');
                }
            } catch (error) {
                console.error('Error stopping recording', error);
            } finally {
                this.cleanupRecording();
            }
        }
    }

    formatDuration(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    async sendMediaMessage(content: string, type: string) {
        if (!this.roomId) return;
        const tempId = `temp_${Date.now()}`;

        const messageObj = {
            id: tempId,
            roomId: this.roomId,
            sender_id: this.currentUser.id,
            content: content,
            created_at: new Date().getTime(),
            messageType: type,
            status: 'sending',
            senderName: this.currentUser.name
        };

        await this.chatStorage.addMessage(messageObj);

        this.socketService.sendMessage(this.roomId, content, this.socketService.selectedLanguage(), type, null, tempId);

        this.scrollToBottom();
    }

    openImageModal(imageUrl: string) {
        if (imageUrl) {
            this.selectedImageUrl = imageUrl;
            this.showImageModal = true;
        }
    }

    detectMessageType(content: string, providedType: string): string {
        if (providedType && providedType !== 'text') {
            return providedType;
        }

        if (content && typeof content === 'string') {
            if (content.startsWith('data:audio') || content.startsWith('data:video') ||
                content.endsWith('.webm') || content.endsWith('.mp3') ||
                content.endsWith('.wav') || content.endsWith('.aac') || content.endsWith('.m4a')) {
                return 'voice';
            }
            if (content.startsWith('data:image') || content.match(/\.(jpeg|jpg|gif|png)$/) != null) {
                return 'image';
            }
        }

        return 'text';
    }

    getFlagIcon(location: string): string {
        return this.countryService.getFlagUrl(location);
    }

    getLocationLabel(location: string): string {
        return this.countryService.getCountryName(location);
    }

    formatLastActive(lastActive: string | number | undefined): string {
        if (!lastActive) return '';

        let unixTimestamp: number;
        if (typeof lastActive === 'number') {
            unixTimestamp = lastActive;
        } else if (/^\d+$/.test(String(lastActive))) {
            unixTimestamp = parseInt(String(lastActive), 10);
        } else {
            return '';
        }

        return this.timestampService.formatRelativeTime(unixTimestamp);
    }

    trackByMessageId(index: number, msg: any): any {
        return msg.id || index;
    }

    trackByGroup(index: number, group: any): any {
        return group.date;
    }
}