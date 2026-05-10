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
import { GamificationService } from '../../services/gamification.service';
import { CallService } from '../../services/call.service';
import { VoiceChatService } from '../../services/voice-chat.service';
import { Subscription } from 'rxjs';
import { VoiceRecorder } from '@independo/capacitor-voice-recorder';
import { AiService, AiSuggestion } from '../../services/ai.service';


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
    public languageService = inject(LanguageService);
    public gamificationService = inject(GamificationService);
    public callService = inject(CallService);
    public voiceService = inject(VoiceChatService);
    private aiService = inject(AiService);


    // Signals from Service
    messages = this.chatService.orderedMessages;
    loadingMessages = this.chatService.loadingMessages;
    isSyncing = this.chatService.isSyncing;
    usersInRoom = signal<number[]>([]); // Track users in current room

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
    recordingDuration = 0; // in seconds

    // Actions Dropdown & Send Coins
    showActionsMenu = false;
    showSendCoinsModal = false;
    sendCoinsAmount: number = 10;
    sendCoinsNote: string = '';
    sendingCoins = false;
    private recordingInterval: any = null;
    stickers = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌',
        '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓',
        '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
        '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶',
        '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑',
        '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
        '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕',
        '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈',
        '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌',
        '👐', '🤲', '🤝', '🙏', '💪', '🦾', '🖕',
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞',
        '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '💥', '💫', '💦', '💨', '💤', '💢',
        '💯', '✨', '⭐', '🌟', '⚡', '☄️', '🌈',
        '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😈', '👿', '👹', '👺', '🤡',
        '💩', '😼', '😻', '😹', '😽', '🙀', '😿', '😾', '🐶', '🐱', '🐭', '🐹', '🐰',
        '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊',
        '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄',
        '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🕸', '🦂', '🐢',
        '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟',
        '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏',
        '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐',
        '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊',
        '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿', '🦔', '🐾', '🐉', '🐲',
        '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🎍', '🎋', '🍃', '🍂',
        '🍁', '🍄', '🐚', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻',
        '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔',
        '🌙', '🌎', '🌍', '🌏', '🪐', '💫', '⭐️', '🌟', '✨', '⚡', '☄️', '💥', '🔥',
        '🌪', '🌈', '☀️', '🌤', '⛅', '🌥', '☁️', '🌦', '🌧', '⛈', '🌩', '🌨', '❄️',
        '☃️', '⛄', '🌬', '💨', '💧', '💦', '☔', '☂️', '🌊', '🌫',
        '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭',
        '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽', '🥕', '🧄',
        '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞',
        '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆',
        '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪',
        '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧',
        '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯',
        '🥛', '🍼', '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸',
        '🍹', '🧉', '🍾', '🧊', '🥄', '🍴', '🍽', '🥣', '🥡', '🥢', '🧂',
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸',
        '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽',
        '🛹', '🛷', '⛸', '🥌', '🎿', '⛷', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺',
        '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆',
        '🥇', '🥈', '🥉', '🏅', '🎖', '🏵', '🎗', '🎫', '🎟', '🎪', '🤹', '🎭', '🩰',
        '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲',
        '♟', '🎯', '🎳', '🎮', '🎰', '🧩',
        '🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜',
        '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖',
        '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇',
        '🚊', '🚉', '🚁', '🛩', '✈️', '🛫', '🛬', '🪂', '💺', '🛰', '🚀', '🛸', '🛶',
        '⛵', '🛥', '🚤', '⛴', '🛳', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥', '🚏', '🗺',
        '🗿', '🗽', '🗼', '🏰', '🏯', '🏟', '🎡', '🎢', '🎠', '⛲', '⛱', '🏖', '🏝',
        '🏜', '🌋', '⛰', '🏔', '🗻', '🏕', '⛺', '🏠', '🏡', '🏘', '🏚', '🏗', '🏭',
        '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛', '⛪',
        '🕌', '🕍', '🛕', '🕋', '⛩', '🛤', '🛣',
        '🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍰', '🧁', '🕯', '🍬', '🍭', '🎌',
        '🎎', '🎏', '🎐', '🎑', '🍷', '🥂', '☕', '🍵'
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

    // Message Actions
    activeMsgMenu: string | null = null; // ID of message with open menu
    isEditing: boolean = false;
    isCorrecting: boolean = false;
    editingMsgId: string | null = null;

    // Game Invites
    gameInvitation: any = null;
    waitingForGameResponse: boolean = false;

    // AI Features
    aiSuggestions = signal<AiSuggestion[]>([]);
    isGeneratingAi = signal(false);
    isFixingSentence = signal(false);
    showAiChatModal = false;
    aiChatMessages = signal<{role: 'user' | 'ai', content: string}[]>([]);
    aiChatInput = '';
    isAiTyping = signal(false);



    lastMessageCount: number = 0;
    private sendSound = new Audio('/mp3/tick.mp3');

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

        // Listen for room user updates
        this.subs.add(this.socketService.roomUsers$.subscribe((data: any) => {
            if (data.roomId === this.roomId) {
                this.usersInRoom.set(data.users);
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

        // Typing - Check if the typing user is our partner (backend sends userId, not roomId)
        this.subs.add(this.socketService.onUserTyping().subscribe((data) => {
            if (this.partner && Number(data.userId) === Number(this.partner.id)) {
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

        // Checkers Invite
        this.subs.add(this.socketService.checkersInvite$.subscribe(invite => {
            this.gameInvitation = invite;
            this.cdr.markForCheck();
        }));

        // Checkers Start
        this.subs.add(this.socketService.checkersStart$.subscribe(() => {
            this.waitingForGameResponse = false;
            this.cdr.markForCheck();
            this.router.navigate(['/dashboard/games/checkers'], { state: { returnUrl: this.router.url } });
        }));

        // Checkers Rejected
        this.subs.add(this.socketService.checkersRejected$.subscribe((data: any) => {
            this.waitingForGameResponse = false;
            this.cdr.markForCheck();
            alert(this.languageService.translate('CHAT.INVITE_DECLINED') || 'Invitation declined');
        }));

        // Checkers Cancelled (sender cancelled the invite)
        this.subs.add(this.socketService.checkersCancelled$.subscribe(() => {
            this.gameInvitation = null;
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

        if (this.isEditing && this.editingMsgId) {
            const msg = this.messages().find(m => m.id === this.editingMsgId);
            if (msg) {
                this.chatService.editMessage(msg, this.newMessage);
            }
            this.cancelEdit();
        } else {
            this.chatService.sendMessage(this.newMessage, this.replyingToMessage, 'text', this.isCorrecting);
            this.playSendSound();
        }

        this.newMessage = '';
        this.replyingToMessage = null;
        this.isCorrecting = false;
        this.socketService.emitTyping(this.roomId!, false);
        this.aiSuggestions.set([]); // Clear suggestions after sending
    } // end sendMessage


    // Message Actions Menu
    openMsgMenu(event: Event, msg: any) {
        event.stopPropagation();
        if (this.activeMsgMenu === msg.id) {
            this.activeMsgMenu = null;
        } else {
            this.activeMsgMenu = msg.id;
            // Close on outside click
            setTimeout(() => {
                const closeHandler = () => {
                    this.activeMsgMenu = null;
                    this.cdr.markForCheck();
                    document.removeEventListener('click', closeHandler);
                };
                document.addEventListener('click', closeHandler);
            }, 0);
        }
    }

    onEdit(msg: any) {
        this.isEditing = true;
        this.editingMsgId = msg.id;
        this.newMessage = msg.content;

        // Focus input
        setTimeout(() => {
            const input = document.getElementById('chatInput');
            if (input) input.focus();
        }, 100);
    }

    cancelEdit() {
        this.isEditing = false;
        this.editingMsgId = null;
        this.newMessage = '';
    }

    onDelete(msg: any) {
        if (confirm(this.languageService.translate('CHAT.CONFIRM_DELETE'))) {
            this.chatService.deleteMessage(msg);
        }
    }

    onCorrect(msg: any) {
        // "Correct" is a special reply that prefills the input with the original text
        this.replyingToMessage = msg;
        this.newMessage = msg.content; // Prefill
        this.isCorrecting = true;

        // Focus input
        setTimeout(() => {
            const input = document.getElementById('chatInput');
            if (input) input.focus();
        }, 100);
    }

    replyTo(msg: any) {
        this.replyingToMessage = msg;
        this.isCorrecting = false;
        setTimeout(() => {
            const input = document.getElementById('chatInput');
            if (input) input.focus();
        }, 100);
    }

    cancelReply() {
        this.replyingToMessage = null;
        this.isCorrecting = false;
    }

    private playSendSound() {
        this.sendSound.currentTime = 0;
        this.sendSound.play().catch(e => console.error('Error playing sound:', e));
    }

    // Debounce timer for typing indicator
    private typingTimeout: any = null;

    onTyping() {
        if (this.roomId) {
            this.socketService.emitTyping(this.roomId, true);

            // Clear previous timeout
            if (this.typingTimeout) {
                clearTimeout(this.typingTimeout);
            }

            // Set new timeout to stop typing after 2 seconds of inactivity
            this.typingTimeout = setTimeout(() => {
                if (this.roomId) {
                    this.socketService.emitTyping(this.roomId, false);
                }
            }, 2000);
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



    addSticker(sticker: string) {
        this.newMessage += sticker;
        // Keep picker open for multiple selections
        // this.showStickerPicker = false; 
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
            this.socketService.acceptCheckersInvite(this.gameInvitation.socketId, this.gameInvitation.amount);
            this.gameInvitation = null;
        }
    }

    rejectGameInvite() {
        if (this.gameInvitation) {
            this.socketService.rejectCheckersInvite(this.gameInvitation.socketId);
            this.gameInvitation = null;
        }
    }

    sendGameInvite() {
        if (this.roomId && this.partner) {
            if (!this.socketService.isUserOnline(this.partner.id)) {
                alert(this.languageService.translate('CHAT.USER_OFFLINE') || 'User is offline');
                return;
            }

            // Check if partner is in the room
            if (!this.usersInRoom().includes(this.partner.id)) {
                alert(this.languageService.translate('CHAT.USER_NOT_IN_ROOM') || 'User is not in this chat room');
                return;
            }

            // Default 50 coins for chat invite
            this.socketService.sendCheckersInvite(this.partner.id, 50);
            this.waitingForGameResponse = true;
            this.cdr.markForCheck();
        }
    }

    cancelGameInvite() {
        if (this.partner) {
            this.socketService.cancelCheckersInvite(this.partner.id);
        }
        this.waitingForGameResponse = false;
        this.cdr.markForCheck();
    }

    // Actions dropdown toggle
    toggleActionsMenu(event: Event) {
        event.stopPropagation();
        this.showActionsMenu = !this.showActionsMenu;

        // Close on outside click
        if (this.showActionsMenu) {
            const closeHandler = () => {
                this.showActionsMenu = false;
                this.cdr.markForCheck();
                document.removeEventListener('click', closeHandler);
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 0);
        }
    }

    // Voice Calling 
    startVoiceCall() {
        if (!this.partner || !this.roomId) return;
        this.callService.startCall(this.partner.id, this.partnerName, this.partnerAvatar, this.roomId);
    }

    isSelfSpeaking(): boolean {
        return !!this.voiceService.speakerActivity().get(0);
    }

    isPartnerSpeaking(): boolean {
        return !!this.voiceService.speakerActivity().get(this.partner?.id);
    }

    openSendCoinsModal() {
        this.showSendCoinsModal = true;
        this.sendCoinsAmount = 10;
        this.sendCoinsNote = '';
    }

    closeSendCoinsModal() {
        this.showSendCoinsModal = false;
        this.sendCoinsAmount = 10;
        this.sendCoinsNote = '';
    }

    sendCoins() {
        if (!this.partner || this.sendCoinsAmount <= 0 || this.sendingCoins) return;

        this.sendingCoins = true;
        this.gamificationService.sendCoins(this.partner.id, this.sendCoinsAmount, this.sendCoinsNote).subscribe({
            next: (res: any) => {
                this.sendingCoins = false;
                this.closeSendCoinsModal();
                // Show success message
                alert(`${res.sent_amount} coins sent to ${res.receiver_name}!`);
                this.cdr.markForCheck();
            },
            error: (err: any) => {
                this.sendingCoins = false;
                alert(err.error?.error || 'Failed to send coins');
                this.cdr.markForCheck();
            }
        });
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
                // Upload file to server
                this.api.uploadFile(file, 'image').subscribe({
                    next: (res: any) => {
                        if (res.success && res.url) {
                            this.chatService.sendMessage(res.url, this.replyingToMessage, 'image');
                            this.playSendSound();
                            this.showMediaMenu = false;
                        } else {
                            alert(this.languageService.translate('CHAT.UPLOAD_FAILED') || 'Failed to upload image');
                        }
                    },
                    error: (err) => {
                        console.error('Image upload failed', err);
                        alert(this.languageService.translate('CHAT.UPLOAD_FAILED') || 'Failed to upload image');
                    }
                });
            }
        };
        input.click();
    }

    async downloadFile(url: string, type: 'image' | 'audio') {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;

            const timestamp = new Date().getTime();
            if (type === 'image') {
                a.download = `chatme_img_${timestamp}.jpg`;
            } else {
                a.download = `chatme_audio_${timestamp}.${url.endsWith('.mp3') ? 'mp3' : 'm4a'}`;
            }

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

            // Optional: Play a sound or show a toast on success
        } catch (error) {
            console.error('Error downloading file:', error);
            alert(this.languageService.translate('CHAT.DOWNLOAD_FAILED') || 'Failed to download file');
        }
    }

    async startRecording() {
        try {
            const status = await VoiceRecorder.requestAudioRecordingPermission();
            if (status.value) {
                // Set bitrate to 128kbps as requested. Note: Plugin support may vary by platform.
                await (VoiceRecorder as any).startRecording({
                    bitrate: 128000
                });
                this.isRecording = true;

                this.recordingDuration = 0;
                this.cdr.markForCheck();

                // Start timer
                this.recordingInterval = setInterval(() => {
                    this.recordingDuration++;
                    this.cdr.markForCheck();
                }, 1000);
            }
        } catch (e) {
            console.error('Error starting recording', e);
        }
    }

    async stopAndSendRecording() {
        try {
            if (this.recordingInterval) {
                clearInterval(this.recordingInterval);
                this.recordingInterval = null;
            }

            const result = await VoiceRecorder.stopRecording();
            this.isRecording = false;
            this.recordingDuration = 0;
            this.cdr.markForCheck();

            if (result.value && result.value.recordDataBase64) {
                const base64Sound = result.value.recordDataBase64;
                try {
                    const binaryString = window.atob(base64Sound);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: 'audio/m4a' });
                    const file = new File([blob], `voice_${Date.now()}.m4a`, { type: 'audio/m4a' });

                    this.api.uploadFile(file, 'voice').subscribe({
                        next: (res: any) => {
                            if (res.success && res.url) {
                                this.chatService.sendMessage(res.url, this.replyingToMessage, 'audio');
                                this.playSendSound();
                                this.showMediaMenu = false;
                            } else {
                                alert(this.languageService.translate('CHAT.UPLOAD_FAILED') || 'Failed to upload audio');
                            }
                        },
                        error: (err) => {
                            console.error('Audio upload failed', err);
                            alert(this.languageService.translate('CHAT.UPLOAD_FAILED') || 'Failed to upload audio');
                        }
                    });
                } catch (e) {
                    console.error('Error converting base64 to file', e);
                }
            }
        } catch (e) {
            console.error('Error stopping recording', e);
            this.isRecording = false;
            this.recordingDuration = 0;
        }
    }

    async cancelRecording() {
        try {
            if (this.recordingInterval) {
                clearInterval(this.recordingInterval);
                this.recordingInterval = null;
            }

            await VoiceRecorder.stopRecording();
            this.isRecording = false;
            this.recordingDuration = 0;
            this.cdr.markForCheck();
        } catch (e) {
            console.error('Error canceling recording', e);
            this.isRecording = false;
            this.recordingDuration = 0;
        }
    }

    formatRecordingTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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

    // AI Logic
    generateAiSuggestions() {
        if (!this.roomId) return;
        this.isGeneratingAi.set(true);

        // Prepare history
        const history = this.messages()
            .slice(-10)
            .map(m => `${m.senderName || (m.type === 'sent' ? 'Me' : 'Partner')}: ${m.content}`)
            .join('\n');

        const myLang = this.languageService.currentLang();
        const pLang = this.partner?.language || myLang; // Fallback to my lang

        this.aiService.generateSuggestions(history, myLang, pLang, this.currentUser.name).subscribe({
            next: (suggestions) => {
                this.aiSuggestions.set(suggestions);
                this.isGeneratingAi.set(false);
                this.cdr.detectChanges(); // Use detectChanges for immediate UI update in OnPush
            },
            error: (err) => {
                console.error('AI Suggestion error', err);
                this.isGeneratingAi.set(false);
                this.cdr.detectChanges();
            }
        });
    }

    useAiSuggestion(suggestion: AiSuggestion) {
        this.newMessage = suggestion.textToSend;
        this.aiSuggestions.set([]);
        this.cdr.detectChanges();
        // Optional: Send immediately? User might want to edit.
        // this.sendMessage();
    }

    fixMySentence() {
        if (!this.newMessage.trim() || this.isFixingSentence()) return;

        this.isFixingSentence.set(true);
        this.cdr.detectChanges();
        this.aiService.fixSentence(this.newMessage).subscribe({
            next: (fixed) => {
                this.newMessage = fixed;
                this.isFixingSentence.set(true); // Wait, should be false
                this.isFixingSentence.set(false);
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('AI Fix error', err);
                this.isFixingSentence.set(false);
                this.cdr.detectChanges();
            }
        });
    }

    openAiChat() {
        this.showAiChatModal = true;
        this.cdr.detectChanges();
    }

    closeAiChat() {
        this.showAiChatModal = false;
        this.cdr.detectChanges();
    }

    sendAiQuestion() {
        if (!this.aiChatInput.trim() || this.isAiTyping()) return;

        const question = this.aiChatInput.trim();
        this.aiChatInput = '';
        
        const currentMsgs = this.aiChatMessages();
        this.aiChatMessages.set([...currentMsgs, { role: 'user', content: question }]);
        this.isAiTyping.set(true);
        this.cdr.detectChanges();

        this.aiService.askAi(question).subscribe({
            next: (answer) => {
                const updatedMsgs = this.aiChatMessages();
                this.aiChatMessages.set([...updatedMsgs, { role: 'ai', content: answer }]);
                this.isAiTyping.set(false);
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('AI Chat Error:', err);
                const updatedMsgs = this.aiChatMessages();
                this.aiChatMessages.set([...updatedMsgs, { role: 'ai', content: 'Sorry, I am having trouble connecting right now.' }]);
                this.isAiTyping.set(false);
                this.cdr.detectChanges();
            }
        });
    }
}


