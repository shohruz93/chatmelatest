import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CountryService } from '../../services/country.service';
import { TimestampService } from '../../services/timestamp.service';
import { Subscription, lastValueFrom } from 'rxjs';
import { VoiceRecorder, RecordingData } from '@independo/capacitor-voice-recorder';

import { TranslationService } from '../../services/translation.service';
import { CountrySelectComponent } from '../../components/country-select/country-select.component';
import { UserProfileModalComponent } from '../../components/user-profile-modal/user-profile-modal.component';
import { ImageModalComponent } from '../../components/image-modal/image-modal.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DatePipe } from '@angular/common';

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

    messages: any[] = [];
    newMessage: string = '';
    pendingMessages: string[] = [];
    roomId: string | null = null;
    currentUser: any;
    partnerTyping: boolean = false;
    private typingTimeout: any;
    waitingForResponse = false;

    // Modal states
    showPartnerLeftBanner = false;
    showRatingModal = false;
    partnerStatus: 'online' | 'offline' = 'online';
    partnerIdToRate: number | null = null;
    selectedRating: number = 0;
    ratingComment: string = '';
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
    private messageSub!: Subscription;
    private typingSub!: Subscription;
    private partnerLeftSub!: Subscription;
    private randomUserSub!: Subscription;
    private roomDetailsSub!: Subscription;
    private statusSub!: Subscription;
    private requestSub!: Subscription;
    private editSub!: Subscription;
    private deleteSub!: Subscription;

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

    // Advanced matching features
    queuePosition: number = 0;
    totalWaiting: number = 0;
    estimatedWaitTime: number = 0;
    compatibilityScore: number = 0;
    matchReasons: string[] = [];
    compatibilityBreakdown: any = null;
    retryMessage: string = '';
    currentMatchId: number | null = null;



    ngOnInit() {
        this.locationOptions = this.countryService.getCountryOptions();
        // Initialize current user from localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.currentUser = JSON.parse(userStr);
        } else {
            console.error('No user found in localStorage');
            // Redirect to login or handle appropriately
        }

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
        const partnerId = this.route.snapshot.paramMap.get('userId');
        if (partnerId) {
            const pId = parseInt(partnerId);
            if (!isNaN(pId)) {
                const sortedIds = [this.currentUser.id, pId].sort();
                this.roomId = `room_${sortedIds[0]}_${sortedIds[1]}`;

                // Join the chat room
                this.socketService.emit('join_chat', { roomId: this.roomId });

                // Load messages and partner details
                this.loadMessageHistory();
                this.socketService.emit('get_room_details', { roomId: this.roomId });

                // Set partner ID for rating
                this.partnerIdToRate = pId;
            }
        }

        this.matchSub = this.socketService.onMatchFound().subscribe(data => {
            this.roomId = data.roomId;
            this.waitingForResponse = false;
            this.socketService.isSearching.set(false);
            this.foundUser = null; // Close found user modal if open

            // Store match quality data
            this.compatibilityScore = data.compatibilityScore || 0;
            this.matchReasons = data.matchReasons || [];
            this.compatibilityBreakdown = data.breakdown || null;

            const matchMsg = this.compatibilityScore > 0
                ? `Match found! Compatibility: ${this.compatibilityScore.toFixed(0)}%`
                : 'Match found! Say hello.';
            this.messages.push({ type: 'system', content: matchMsg });

            this.loadMessageHistory();

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

        this.roomDetailsSub = this.socketService.on('room_details').subscribe((data: any) => {
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
                    // Set partner initial status correctly
                    this.partnerStatus = this.socketService.isUserOnline(partnerProfile.id) ? 'online' : 'offline';
                    this.partnerIdToRate = partnerProfile.id;
                }
            }
        });

        this.messageSub = this.socketService.onMessage().subscribe(message => {
            // Construct roomId if missing (backward compatibility)
            let messageRoomId = message.roomId;
            if (!messageRoomId && message.senderId && message.receiverId) {
                const sortedIds = [Number(message.senderId), Number(message.receiverId)].sort();
                messageRoomId = `room_${sortedIds[0]}_${sortedIds[1]}`;
            }

            // Check if message belongs to current room
            if (messageRoomId === this.roomId) {
                const shouldScroll = this.isUserNearBottom();

                let timestamp = message.timestamp || new Date();
                if (typeof timestamp === 'number' && timestamp < 10000000000) {
                    timestamp *= 1000;
                }

                // Add message with proper ID
                this.messages.push({
                    id: message.id || Date.now(),
                    type: 'received',
                    content: message.content,
                    created_at: timestamp,
                    messageType: this.detectMessageType(message.content, message.type),
                    read: false,
                    originalLang: message.originalLang,
                    replyTo: message.replyTo,
                    senderName: message.senderName || this.partnerName
                });

                if (shouldScroll) {
                    this.scrollToBottom();
                }

                // Mark as read immediately if we are in the room
                this.markMessagesAsRead();
            }
        });

        // Listen for server ack that message was saved (sent)
        this.socketService.onMessageSent().subscribe((messageData: any) => {
            if (messageData.roomId !== this.roomId) return;

            // Find the first sending message with same content and update it
            const pending = this.messages.find(m => m.type === 'sent' && m.status === 'sending' && m.content === messageData.content);
            if (pending) {
                pending.status = 'sent';
                if (messageData.id) pending.id = messageData.id;
                if (messageData.timestamp) {
                    let timestamp = messageData.timestamp;
                    if (typeof timestamp === 'number' && timestamp < 10000000000) {
                        timestamp *= 1000;
                    }
                    pending.created_at = timestamp;
                }
            }
        });

        this.typingSub = this.socketService.onUserTyping().subscribe((data: any) => {
            this.partnerTyping = data.isTyping;

            if (this.partnerTyping && this.isUserNearBottom()) {
                this.scrollToBottom();
            }

            if (this.partnerTyping) {
                setTimeout(() => {
                    this.partnerTyping = false;
                }, 3000);
            }
        });

        // Listen for partner leaving
        this.partnerLeftSub = this.socketService.onPartnerLeft().subscribe((data) => {
            this.showPartnerLeftBanner = true;
            this.showRatingModal = true;
            this.partnerIdToRate = data.userId;
            this.messages.push({ type: 'system', content: 'Partner has left the chat.' });
            this.partnerStatus = 'offline';
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
        this.socketService.onMessageRead().subscribe((data: any) => {
            if (data.roomId === this.roomId) {
                this.messages.forEach(msg => {
                    if (msg.type === 'sent' && !msg.read) {
                        msg.read = true;
                        msg.status = 'read'; // Update status to read
                    }
                });
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

    ngOnDestroy() {
        if (this.matchSub) this.matchSub.unsubscribe();
        if (this.messageSub) this.messageSub.unsubscribe();
        if (this.typingSub) this.typingSub.unsubscribe();
        if (this.partnerLeftSub) this.partnerLeftSub.unsubscribe();
        if (this.randomUserSub) this.randomUserSub.unsubscribe();
        if (this.roomDetailsSub) this.roomDetailsSub.unsubscribe();
        if (this.statusSub) this.statusSub.unsubscribe();
        if (this.requestSub) this.requestSub.unsubscribe();
        if (this.editSub) this.editSub.unsubscribe();
        if (this.deleteSub) this.deleteSub.unsubscribe();

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
            type: String(msg.sender_id) === String(this.currentUser.id) ? 'sent' : 'received',
            content: msg.content,
            created_at: timestamp,
            messageType: this.detectMessageType(msg.content, msg.type),
            read: (msg.is_read !== undefined) ? Boolean(msg.is_read) : (msg.read || false),
            status: ((msg.is_read !== undefined ? msg.is_read : msg.read) ? 'read' : 'sent'),
            replyTo: msg.replyTo,
            originalLang: msg.original_lang,
            senderName: msg.senderName
        };
    }

    get groupedMessages() {
        if (!this.messages || this.messages.length === 0) return [];

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

    loadMessageHistory() {
        if (!this.roomId) return;
        this.isLoadingHistory = true;
        this.socketService.loadMessages(this.roomId, 30, 0);

        const sub = this.socketService.onMessagesLoaded().subscribe((data: any) => {
            if (data.roomId === this.roomId && !this.isLoadingMore) { // Only handle initial load here
                this.messages = data.messages.map((msg: any) => this.mapMessage(msg));

                // Mark messages as read
                this.markMessagesAsRead();

                // Scroll to bottom on initial load
                this.scrollToBottom('auto');
                this.isLoadingHistory = false;
                sub.unsubscribe(); // Unsubscribe after initial load
            }
        }, (err) => {
            this.isLoadingHistory = false;
            sub.unsubscribe();
        });
    }

    loadMoreMessages() {
        if (!this.roomId || this.isLoadingMore) return;

        this.isLoadingMore = true;
        const currentScrollHeight = this.scrollContainer.nativeElement.scrollHeight;
        const offset = this.messages.length;

        this.socketService.loadMessages(this.roomId, 30, offset);

        // We need a one-time subscription for this specific load
        const sub = this.socketService.onMessagesLoaded().subscribe((data: any) => {
            if (data.roomId === this.roomId) {
                if (data.messages.length === 0) {
                    this.allMessagesLoaded = true;
                } else {
                    const newMessages = data.messages.map((msg: any) => this.mapMessage(msg));

                    this.messages = [...newMessages, ...this.messages];

                    // Restore scroll position
                    setTimeout(() => {
                        if (this.scrollContainer) {
                            const newScrollHeight = this.scrollContainer.nativeElement.scrollHeight;
                            this.scrollContainer.nativeElement.scrollTop = newScrollHeight - currentScrollHeight;
                        }
                    }, 0);
                }
            }
            this.isLoadingMore = false;
            sub.unsubscribe();
        });
    }

    sendMessage() {
        if (!this.newMessage.trim()) {
            return;
        }

        if (!this.roomId && !this.waitingForResponse) {
            return;
        }

        const content = this.newMessage;

        if (this.editingMessage) {
            this.socketService.emit('edit_message', {
                roomId: this.roomId,
                messageId: this.editingMessage.id,
                content: content
            });
            const msgToEdit = this.messages.find(m => m.id === this.editingMessage.id);
            if (msgToEdit) {
                msgToEdit.content = content;
                msgToEdit.translatedContent = null;
                msgToEdit.showTranslation = false;
            }
            this.cancelInputMode();
            this.newMessage = '';
            return;
        }

        const replyTo = this.replyingToMessage ? {
            id: this.replyingToMessage.id,
            content: this.replyingToMessage.content,
            senderName: this.replyingToMessage.senderName || 'Partner'
        } : null;

        const tempMessageId = Date.now();

        if (this.roomId) {
            this.socketService.sendMessage(this.roomId, content, this.socketService.selectedLanguage(), 'text', replyTo);
        } else if (this.waitingForResponse) {
            this.pendingMessages.push(content);
        }

        const messageObj: any = {
            id: tempMessageId,
            type: 'sent',
            content: content,
            created_at: new Date(),
            messageType: 'text',
            read: false,
            status: 'sending',
            replyTo: replyTo,
            senderName: this.currentUser.name
        };

        this.messages.push(messageObj);

        this.newMessage = '';
        this.cancelInputMode();

        if (this.roomId) {
            this.socketService.emitTyping(this.roomId, false);
        }
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        this.scrollToBottom();
        // status will be updated when server acknowledges via 'message_sent'
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

    deleteMessage(msg: any) {
        if (confirm('Are you sure you want to delete this message?')) {
            this.socketService.emit('delete_message', {
                roomId: this.roomId,
                messageId: msg.id
            });
            // Instantly remove from UI
            this.messages = this.messages.filter(m => m.id !== msg.id);
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

    // Rating methods
    setRating(rating: number) {
        this.selectedRating = rating;
    }

    async submitRating() {
        if (this.selectedRating === 0 || !this.partnerIdToRate) {
            this.closeRatingModal();
            return;
        }

        try {
            await lastValueFrom(this.api.post('/profile/rating', {
                raterId: this.currentUser.id,
                ratedId: this.partnerIdToRate,
                rating: this.selectedRating,
                comment: this.ratingComment
            }));
        } catch (error) {
            // Error submitting rating
        }

        this.closeRatingModal();
    }

    skipRating() {
        this.closeRatingModal();
    }

    closeRatingModal() {
        this.showRatingModal = false;
        this.selectedRating = 0;
        this.ratingComment = '';
        this.partnerIdToRate = null;
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
        if (this.roomId) {
            this.socketService.sendTyping(this.roomId);
        }
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

    sendMediaMessage(content: string, type: string) {
        if (this.roomId) {
            const tempMessageId = Date.now();
            this.socketService.sendMessage(this.roomId, content, this.socketService.selectedLanguage(), type);

            const messageObj: any = {
                id: tempMessageId,
                type: 'sent',
                content: content,
                created_at: new Date(),
                messageType: type,
                read: false,
                status: 'sending',
                senderName: this.currentUser.name
            };

            this.messages.push(messageObj);

            this.scrollToBottom();

            // status will be updated when server acknowledges via 'message_sent'
        }
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
}