import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef, effect } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { LanguageService } from '../../services/language.service';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CountryService } from '../../services/country.service';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { Subscription } from 'rxjs';
import { VoiceRecorder } from '@independo/capacitor-voice-recorder';

import { TranslationService } from '../../services/translation.service';
import { CountrySelectComponent } from '../../components/country-select/country-select.component';
import { UserProfileModalComponent } from '../../components/user-profile-modal/user-profile-modal.component';
import { ImageModalComponent } from '../../components/image-modal/image-modal.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, CountrySelectComponent, ImageModalComponent, UserProfileModalComponent, TranslatePipe, SafeUrlPipe],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css', './chat-messages.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('messageAnimation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(20px)' }),
                animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
            ])
        ]),
        trigger('statusAnimation', [
            transition(':enter', [
                style({ transform: 'scale(0)' }),
                animate('200ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', style({ transform: 'scale(1)' }))
            ])
        ])
    ]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messagesContainer') private scrollContainer!: ElementRef;

    public chatService = inject(ChatService);
    public socketService = inject(SocketService); // Still needed for non-message events
    public auth = inject(AuthService); // Public for template
    private route = inject(ActivatedRoute);
    private api = inject(ApiService);
    private countryService = inject(CountryService);
    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);
    // languageService needed? maybe for translation

    // Signals from Service
    messages = this.chatService.orderedMessages;
    loadingMessages = this.chatService.loadingMessages;
    isSyncing = this.chatService.isSyncing;

    newMessage: string = '';
    roomId: string | null = null;
    currentUser: any;

    // UI State
    partnerTyping: boolean = false;
    waitingForResponse = false;
    isOnline = signal(navigator.onLine);

    // Modal & Other states
    showFilterModal = false;
    showPartnerLeftBanner = false;
    // Filter State
    filterGender: string = 'any';
    filterLocation: string = '';
    filterOnlineOnly: boolean = false;

    partnerStatus: 'online' | 'offline' = 'online';
    showPartnerProfileModal = false;
    showImageModal = false;
    selectedImageUrl = '';

    // Media & Stickers
    showMediaMenu = false;
    showStickerPicker = false;
    isRecording = false;
    stickers = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌',
        '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓',
        '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
        '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶',
        '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑',
        '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
        '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕',
        '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
        '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌',
        '👐', '🤲', '🙏', '🤝', '💪', '🦾', '🖕',
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔', '❣️', '💕', '💞',
        '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '💥', '💫', '💦', '💨', '💤', '💢',
        '💯', '✨', '⭐', '🌟', '⚡', '☄️', '🌈',
        '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😈', '👿', '👹', '👺', '🤡',
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷',
        '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥',
        '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌',
        '🐞', '🐜', '🪲', '🪳', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕',
        '🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍰', '🍕', '🍔', '🍟', '🌭', '🍿',
        '🥤', '🍺', '🍻', '🥂', '🍷', '🥃', '☕', '🍵'
    ];

    partner: any = null;
    get partnerName() { return this.partner?.display_name || this.partner?.username || this.partner?.name || 'Partner'; }
    get partnerAvatar() { return this.partner?.avatar; }
    get isPartnerOnline() { return this.partnerStatus === 'online'; }

    // Subscriptions
    private subs: Subscription = new Subscription();

    // Reply/Edit
    editingMessage: any = null; // Still handle edit logic locally in UI until sent
    replyingToMessage: any = null;

    // Search/Match Logic
    foundUser: any = null;
    isSendingRequest: boolean = false;
    incomingRequest: any = null;
    queuePosition: number = 0;
    totalWaiting: number = 0;
    estimatedWaitTime: number = 0;
    retryMessage: string = '';
    compatibilityScore: number = 0;

    // Game Invites
    gameInvitation: any = null;

    lastMessageCount: number = 0;

    constructor() {
        // Auto-scroll effect
        effect(() => {
            const msgs = this.messages();
            if (msgs.length > this.lastMessageCount) {
                this.lastMessageCount = msgs.length;
                setTimeout(() => this.scrollToBottom(), 100);
            }
        });
    }

    ngOnInit() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.currentUser = JSON.parse(userStr);
        }

        // Room ID Listener
        this.subs.add(this.route.paramMap.subscribe(params => {
            const partnerIdStr = params.get('userId');
            if (partnerIdStr) {
                const partnerId = parseInt(partnerIdStr);
                if (!isNaN(partnerId)) {
                    const sortedIds = [this.currentUser.id, partnerId].sort((a, b) => a - b);
                    this.roomId = `room_${sortedIds[0]}_${sortedIds[1]}`;

                    // Switch room in Service
                    this.chatService.switchRoom(this.roomId);

                    // Join and get details (SocketService side)
                    this.socketService.emit('join_chat', { roomId: this.roomId });
                    this.socketService.emit('get_room_details', { roomId: this.roomId });
                }
            }
        }));

        this.setupSocketEvents();
    }

    private setupSocketEvents() {
        // Partner Details
        this.subs.add(this.socketService.on('room_details').subscribe((data: any) => {
            if (data.roomId === this.roomId) {
                const partnerProfile = data.participants.find((p: any) => String(p.id) !== String(this.currentUser.id));
                if (partnerProfile) {
                    this.partner = partnerProfile;
                    if (this.partner.avatar && !this.partner.avatar.startsWith('http')) {
                        this.partner.avatar = `${this.api.phpBaseUrl}${this.partner.avatar}`;
                    }
                    this.partnerStatus = this.socketService.isUserOnline(partnerProfile.id) ? 'online' : 'offline';
                    this.cdr.markForCheck();
                }
            }
        }));

        // Typing
        this.subs.add(this.socketService.onUserTyping().subscribe((data) => {
            if (data.roomId === this.roomId) {
                this.partnerTyping = data.isTyping;
                this.cdr.markForCheck();
                if (this.partnerTyping) this.scrollToBottom();
            }
        }));

        // Status
        this.subs.add(this.socketService.onUserStatusChanged().subscribe(data => {
            if (this.partner && Number(data.userId) === Number(this.partner.id)) {
                this.partnerStatus = data.status;
                this.cdr.markForCheck();
            }
        }));

        // Partner Left
        this.subs.add(this.socketService.onPartnerLeft().subscribe(() => {
            this.showPartnerLeftBanner = true;
            this.partnerStatus = 'offline';
            this.cdr.markForCheck();
        }));
    }

    ngOnDestroy() {
        this.subs.unsubscribe();
    }

    ngAfterViewChecked() {
        // managed by effect mostly
    }

    sendMessage() {
        if (!this.newMessage.trim()) return;

        this.chatService.sendMessage(this.newMessage, this.replyingToMessage);

        this.newMessage = '';
        this.replyingToMessage = null;
        this.socketService.emitTyping(this.roomId!, false);
    }

    onTyping() {
        if (this.roomId) {
            this.socketService.emitTyping(this.roomId, true);
            // debounce logic usually inside service or simplified here
            // assuming service handles debounce or server handles it
        }
    }

    scrollToBottom(behavior: ScrollBehavior = 'smooth') {
        if (this.scrollContainer) {
            try {
                this.scrollContainer.nativeElement.scrollTo({
                    top: this.scrollContainer.nativeElement.scrollHeight,
                    behavior: behavior
                });
            } catch (e) { }
        }
    }

    // Helper for template
    isMyMessage(msg: any): boolean {
        return String(msg.senderId) === String(this.currentUser.id);
    }

    // ... Keep other UI methods (modals, stickers, etc.) ...

    replyTo(msg: any) {
        this.replyingToMessage = msg;
        const input = document.getElementById('chatInput');
        if (input) input.focus();
    }

    cancelReply() {
        this.replyingToMessage = null;
    }

    addSticker(sticker: string) {
        this.newMessage += sticker;
        this.showStickerPicker = false;
    }

    toggleStickerPicker() {
        this.showStickerPicker = !this.showStickerPicker;
    }

    /* Keep necessary method stubs to prevent template errors until we cleanup template */
    openPartnerProfile() { this.showPartnerProfileModal = true; }
    closePartnerProfile() { this.showPartnerProfileModal = false; }
    openImageModal(url: string) { this.selectedImageUrl = url; this.showImageModal = true; }
    closeImageModal() { this.showImageModal = false; }
    closeFilterModal() { this.showFilterModal = false; }

    startSearch() {
        // Implement search logic or emit event
        this.closeFilterModal();
        this.socketService.findMatch([], 'en', {
            gender: this.filterGender,
            location: this.filterLocation,
            online: this.filterOnlineOnly
        });
    }

    acceptRequest() {
        if (this.incomingRequest) {
            this.socketService.acceptChatRequest(this.incomingRequest.socketId);
            this.incomingRequest = null;
        }
    }

    rejectRequest() {
        if (this.incomingRequest) {
            this.socketService.rejectChatRequest(this.incomingRequest.socketId);
            this.incomingRequest = null;
        }
    }

    acceptGameInvite() {
        if (this.gameInvitation) {
            this.socketService.emit('accept_game_invite', { inviteId: this.gameInvitation.id });
            this.gameInvitation = null;
        }
    }

    rejectGameInvite() {
        if (this.gameInvitation) {
            this.socketService.emit('reject_game_invite', { inviteId: this.gameInvitation.id });
            this.gameInvitation = null;
        }
    }

    sendGameInvite() {
        if (this.roomId) {
            // Example: invite to 'checkers' for 100 coins
            this.socketService.emit('send_game_invite', { roomId: this.roomId, game: 'checkers', amount: 100 });
        }
    }

    triggerFileInput() {
        // Create hidden input or use Capacitor Camera/FilePicker
        // For web demo:
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                // Convert to base64 and send
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result as string;
                    this.chatService.sendMessage(base64, this.replyingToMessage, 'image');
                    this.showMediaMenu = false;
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }

    async toggleRecording() {
        if (!this.isRecording) {
            // Start
            try {
                // Check permissions
                const status = await VoiceRecorder.requestAudioRecordingPermission();
                if (status.value) {
                    await VoiceRecorder.startRecording();
                    this.isRecording = true;
                }
            } catch (e) {
                console.error('Error starting recording', e);
            }
        } else {
            // Stop
            try {
                const result = await VoiceRecorder.stopRecording();
                this.isRecording = false;
                if (result.value && result.value.recordDataBase64) {
                    const base64Sound = 'data:audio/aac;base64,' + result.value.recordDataBase64;
                    this.chatService.sendMessage(base64Sound, this.replyingToMessage, 'audio');
                    this.showMediaMenu = false;
                }
            } catch (e) {
                console.error('Error stopping recording', e);
                this.isRecording = false;
            }
        }
    }

    translateMessage(msg: any) {
        if (msg.translatedContent) {
            msg.showTranslation = !msg.showTranslation;
        } else {
            console.log('Requesting translation for', msg.id);
            // Request translation
            msg.isTranslating = true;
            this.socketService.translateMessage(msg.id, msg.content, this.socketService.selectedLanguage());

            // Listen for result to stop loading (or timeout)
            // We should ideally subscribe once in ngOnInit, but for quick UI toggle:
            // We'll rely on the service's translationResult$ to update the message in the valid flow
            // But let's add a safety timeout here just in case socket fails silently
            setTimeout(() => {
                if (msg.isTranslating && !msg.translatedContent) {
                    msg.isTranslating = false;
                    this.cdr.markForCheck();
                }
            }, 10000);
        }
    }

    // Grouping logic (Date headers)
    // We can do this in the template with @for and tracking, OR computed signal
    // For now, let's just return the list and handle grouping visually or if needed logic
    // The previous implementation had complex grouping.
    // Let's implement a computed signal for grouped messages in the service or here.

    // Simple helper to check if date changed from previous message
    showDateHeader(msg: any, index: number): boolean {
        if (index === 0) return true;
        const prev = this.messages()[index - 1];
        const date1 = new Date(msg.createdAt).toDateString();
        const date2 = new Date(prev.createdAt).toDateString();
        return date1 !== date2;
    }

    formatDate(timestamp: number): string {
        return new Date(timestamp).toLocaleDateString();
    }
}