import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { SocketService } from './socket.service';
import { ChatStorageService } from './chat-storage.service';
import { AuthService } from './auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, firstValueFrom } from 'rxjs';
import { filter, take, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
    id: string; // Real or temp ID
    roomId: string;
    senderId: number;
    content: string;
    createdAt: number;
    type: 'sent' | 'received' | 'system';
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    messageType: 'text' | 'image' | 'audio' | 'sticker';
    replyTo?: {
        id: string;
        content: string;
        senderName: string;
        messageType?: 'text' | 'image' | 'audio' | 'sticker';
        isCorrection?: boolean;
    } | null;
    originalLang?: string;
    translatedContent?: string;
    showTranslation?: boolean;
    senderName?: string;
    avatar?: string;
    isTranslating?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private socketService = inject(SocketService);
    private chatStorage = inject(ChatStorageService);
    private auth = inject(AuthService);

    // Signals for state
    public currentRoomId = signal<string | null>(null);
    public messages = signal<ChatMessage[]>([]);
    public loadingMessages = signal<boolean>(false);
    public isSyncing = signal<boolean>(false);

    // Derived state
    public orderedMessages = computed(() => {
        return this.messages().sort((a, b) => a.createdAt - b.createdAt);
    });

    constructor() {
        this.setupSocketListeners();
        this.setupNetworkListeners();
    }

    private setupSocketListeners() {
        // Message received
        this.socketService.on('message').subscribe(async (data: any) => {
            if (data.roomId === this.currentRoomId()) {
                const mapped = this.mapServerMessage(data);
                this.addMessageToState(mapped);
                await this.chatStorage.addMessage(data); // Save raw data
                this.updateReadStatusIfNeeded(mapped);

                // Mark as read immediately if in current room
                this.socketService.markMessageRead(data.id, data.roomId);
            } else {
                // Background message, just save
                await this.chatStorage.addMessage(data);
                // TODO: Increment unread count for that room
            }

            // Save Partner Info if present and it's NOT from us
            const currentUserId = this.auth.currentUserValue?.id;
            // senderId could be string or number, compare consistently
            if (data.senderId && Number(data.senderId) !== Number(currentUserId) && (data.senderName || data.avatar)) {
                await this.chatStorage.savePartnerInfo(data.roomId, {
                    id: data.senderId,
                    name: data.senderName || 'Anonymous',
                    avatar: data.avatar
                });
            }
        });

        // Message sent confirmation (ack)
        this.socketService.onMessageSent().subscribe(async (data: any) => {
            // Find temp message and update
            const tempId = data.tempId;
            if (!tempId) return;

            // Update in state
            this.messages.update(msgs => msgs.map(m => {
                if (m.id === tempId) {
                    return { ...m, id: String(data.id), status: 'sent' };
                }
                return m;
            }));

            // Update in storage
            const realMsg = this.mapServerMessage({ ...data, status: 'sent' });
            // We need to map it back to storage format if needed, or just use raw data
            // ensure we save the 'sent' status
            await this.chatStorage.replaceTempMessage(tempId, { ...data, status: 'sent' });
        });

        // Message read receipt
        this.socketService.onMessageRead().subscribe(async (data: any) => {
            if (data.roomId === this.currentRoomId()) {
                this.messages.update(msgs => msgs.map(m => {
                    if (m.type === 'sent' && m.status !== 'read') {
                        return { ...m, status: 'read' };
                    }
                    return m;
                }));
            }
            // Update storage
            // This is efficient: we can update all 'sent' messages in this room to 'read' in DB
            // logic can be in storage service or here iterating.
            // For now, let's assume we update visible ones.
            // A better approach for DB is to update all messages where roomId=X and status='sent'
        });

        // Message Edit
        this.socketService.on('message_edited').subscribe(async (data: any) => {
            // Update state
            this.messages.update(msgs => msgs.map(m => {
                if (m.id === data.messageId) {
                    return { ...m, content: data.content, translatedContent: undefined, showTranslation: false };
                }
                return m;
            }));
            // Update storage (implementation in storage service needed or just re-put)
            // ...
        });

        // Message Delete
        this.socketService.on('message_deleted').subscribe((data: any) => {
            this.messages.update(msgs => msgs.filter(m => m.id !== data.messageId));
            this.chatStorage.deleteMessage(data.messageId); // checking if exists
        });

        // Translation Result
        this.socketService.translationResult$.subscribe((data: any) => {
            if (data.success) {
                this.messages.update(msgs => msgs.map(m => {
                    if (m.id === data.messageId) {
                        return {
                            ...m,
                            translatedContent: data.translatedText,
                            showTranslation: true,
                            isTranslating: false
                        };
                    }
                    return m;
                }));
            } else {
                // Handle error state if needed
                this.messages.update(msgs => msgs.map(m => {
                    if (m.id === data.messageId) {
                        return { ...m, isTranslating: false };
                    }
                    return m;
                }));
                console.error('Translation failed:', data.error);
            }
        });
    }

    private setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.retryPendingMessages();
        });
    }

    public async switchRoom(roomId: string) {
        this.currentRoomId.set(roomId);
        this.messages.set([]); // Clear current view
        this.loadingMessages.set(true);

        try {
            // Ensure DB is open
            const currentUser = this.auth.currentUserValue;
            if (currentUser && currentUser.id) {
                await this.chatStorage.openDb(currentUser.id);
            }

            // 1. Load from IndexedDB (limit to 20 initially for performance)
            const localMsgs = await this.chatStorage.getMessages(roomId, 20, 0);
            const mappedLocal = localMsgs.map(m => this.mapServerMessage(m)).reverse(); // Storage returns reversed usually? verify
            // Actually getMessages in storage reverses them at the end: `resolve(messages.reverse())`
            // So we get chronological order.

            console.log('[ChatService] Loaded local messages:', mappedLocal.length, mappedLocal.map(m => ({ id: m.id, type: m.messageType })));

            this.messages.set(mappedLocal);
            this.loadingMessages.set(false);

            // 2. Sync with Server
            this.syncWithServer(roomId);

        } catch (e) {
            console.error('Error loading chat room:', e);
            this.loadingMessages.set(false);
        }
    }

    private async syncWithServer(roomId: string) {
        this.isSyncing.set(true);

        // Strategy: Get the last message ID we have (ignoring temp ones)
        const lastMsg = this.messages()
            .slice()
            .reverse() // Newest first
            .find(m => !String(m.id).startsWith('temp_'));

        const lastId = lastMsg ? lastMsg.id : null;

        // Ensure we send the ID in the format the server expects (likely number if it was originally number)
        const idToSend = (lastId && !isNaN(Number(lastId)) && !String(lastId).startsWith('temp_'))
            ? Number(lastId)
            : lastId;

        console.log('[CHAT] Syncing messages for room', roomId, 'after ID:', idToSend, '(original:', lastId, ')');

        // Emit sync event
        this.socketService.emit('sync_messages', { roomId, lastMessageId: idToSend });

        // Listen for sync response ONE TIME
        this.socketService.on('sync_response').pipe(
            filter((data: any) => data.roomId === roomId),
            take(1),
            timeout(10000), // 10s timeout
            catchError(err => {
                console.warn('Sync timed out or failed for room', roomId, err);

                // FALLBACK: Load last 20 messages as requested
                console.log('[CHAT] Sync failed, falling back to loading last 20 messages');
                this.socketService.loadMessages(roomId, 20, 0);

                this.isSyncing.set(false);
                return of(null);
            })
        ).subscribe(async (response: any) => {
            if (!response) return; // Handled by catchError

            // ... (rest of logic) ...
            if (response.newMessages?.length) {
                const mappedNew = response.newMessages.map((m: any) => this.mapServerMessage(m));
                this.addMessagesToState(mappedNew);
                await this.chatStorage.addMessagesIfNotExists(response.newMessages);
            }

            if (response.updatedMessages?.length) {
                // Handle edits/status updates
                this.messages.update(msgs => {
                    return msgs.map(m => {
                        const update = response.updatedMessages.find((u: any) => String(u.id) === m.id);
                        if (update) {
                            return { ...m, ...this.mapServerMessage(update) };
                        }
                        return m;
                    });
                });
                // Update storage
                response.updatedMessages.forEach((u: any) => this.chatStorage.updateMessage(u));
            }

            if (response.deletedMessageIds?.length) {
                this.messages.update(msgs => msgs.filter(m => !response.deletedMessageIds.some((d: any) => String(d) === m.id)));
                response.deletedMessageIds.forEach((id: string) => this.chatStorage.deleteMessage(id));
            }

            this.isSyncing.set(false);

            // Mark all valid received messages as read
            this.markAllAsRead(roomId);
        });
    }

    public async sendMessage(content: string, replyToMessage?: ChatMessage, messageType: 'text' | 'image' | 'audio' | 'sticker' = 'text', isCorrection: boolean = false) {
        const roomId = this.currentRoomId();
        if (!roomId || !content.trim()) return;

        const currentUser = this.auth.currentUserValue;
        const tempId = `temp_${Date.now()}`;

        const replyToData = replyToMessage ? {
            id: replyToMessage.id,
            content: replyToMessage.content,
            senderName: replyToMessage.senderName || 'Partner',
            messageType: replyToMessage.messageType, // Include type for UI
            isCorrection: isCorrection
        } : null;

        const newMessage: ChatMessage = {
            id: tempId,
            roomId,
            senderId: currentUser.id,
            content,
            createdAt: Date.now(),
            type: 'sent',
            status: 'sending',
            messageType: messageType,
            replyTo: replyToData,
            senderName: currentUser.name || 'Me'
        };

        // 1. Optimistic Update
        this.addMessageToState(newMessage);

        // 2. Save to Storage
        await this.chatStorage.addMessage({
            ...newMessage,
            sender_id: currentUser.id, // compatibility with storage field naming
            created_at: newMessage.createdAt,
        });

        // 3. Send to Socket
        this.socketService.sendMessage(
            roomId,
            content,
            this.socketService.selectedLanguage(),
            messageType,
            replyToData,
            tempId,
            currentUser.name,
            currentUser.photo_url || currentUser.photoUrl || currentUser.avatar
        );
    }

    public async editMessage(message: ChatMessage, newContent: string) {
        if (!message || !newContent.trim() || message.type !== 'sent') return;

        // Optimistic update
        this.messages.update(msgs => msgs.map(m => {
            if (m.id === message.id) {
                return { ...m, content: newContent, translatedContent: undefined, showTranslation: false };
            }
            return m;
        }));

        this.socketService.editMessage(message.roomId, message.id, newContent);
    }

    public async deleteMessage(message: ChatMessage) {
        if (!message || message.type !== 'sent') return;

        // Optimistic update
        this.messages.update(msgs => msgs.filter(m => m.id !== message.id));

        this.chatStorage.deleteMessage(message.id);
        this.socketService.deleteMessage(message.roomId, message.id);
    }

    private addMessageToState(msg: ChatMessage) {
        this.messages.update(msgs => [...msgs, msg]);
    }

    private addMessagesToState(newMsgs: ChatMessage[]) {
        this.messages.update(msgs => {
            const existingIds = new Set(msgs.map(m => m.id));
            const unique = newMsgs.filter(m => !existingIds.has(m.id));
            return [...msgs, ...unique];
        });
    }

    private async retryPendingMessages() {
        const sendingMsgs = await this.chatStorage.getPendingMessages();
        for (const msg of sendingMsgs) {
            this.socketService.sendMessage(
                msg.roomId,
                msg.content,
                msg.originalLang || 'en',
                msg.messageType || 'text',
                msg.replyTo,
                msg.id
            );
        }
    }

    private mapServerMessage(data: any): ChatMessage {
        const currentUser = this.auth.currentUserValue;
        const isSent = String(data.sender_id || data.senderId) === String(currentUser?.id);

        // Handle timestamps
        let createdAt = data.created_at || data.createdAt || data.timestamp;
        if (typeof createdAt === 'string') createdAt = new Date(createdAt).getTime();
        if (createdAt < 10000000000) createdAt *= 1000; // Handle seconds vs ms

        // Handling Base64 Media Prefixes
        let content = data.content;
        // Prioritize explicit messageType, then fallback to type, then message_type
        let msgType = data.messageType || data.type || data.message_type || 'text';

        if (typeof content === 'string' && content.startsWith('/uploads/')) {
            content = `${environment.phpBaseUrl}${content}`;
        } else if (msgType === 'image' && content && typeof content === 'string' && !content.startsWith('http') && !content.startsWith('data:image')) {
            // Assume JPEG if unknown, but could be PNG. 
            content = `data:image/jpeg;base64,${content}`;
        } else if (msgType === 'audio' && content && typeof content === 'string' && !content.startsWith('http') && !content.startsWith('data:audio')) {
            content = `data:audio/webm;base64,${content}`;
        }

        // Auto-detect type if it's text but has media prefix (Fix for broken history/indexedDB data)
        if (typeof content === 'string') {
            const trimmed = content.trim();
            if (trimmed.startsWith('data:image') || trimmed.includes(';base64,iVBOR') || trimmed.includes('/uploads/images/') || trimmed.endsWith('.jpg') || trimmed.endsWith('.png')) {
                msgType = 'image';
            } else if (trimmed.startsWith('data:audio') || trimmed.includes('data:audio/webm') || trimmed.includes(';base64,GkXfo') || trimmed.includes('/uploads/audio/') || trimmed.endsWith('.m4a') || trimmed.endsWith('.mp3')) {
                // Common opus header start often starts with GkXfo...
                msgType = 'audio';
            }
        }

        // DEBUG LOG
        if (msgType !== 'text') {
            console.log('[ChatService] Mapping special message:', { id: data.id, originalType: data.messageType || data.type, finalType: msgType, contentPrefix: content?.substring(0, 30) });
        }

        // Process replyTo data to ensure messageType exists
        let processedReplyTo = data.replyTo;
        if (processedReplyTo && typeof processedReplyTo === 'object') {
            let replyType = processedReplyTo.messageType;
            const replyContent = processedReplyTo.content || '';

            if (!replyType) {
                if (replyContent.startsWith('data:image')) {
                    replyType = 'image';
                } else if (replyContent.startsWith('data:audio')) {
                    replyType = 'audio';
                } else {
                    replyType = 'text';
                }
            }

            processedReplyTo = {
                ...processedReplyTo,
                messageType: replyType
            };
        } else if (typeof processedReplyTo === 'string' || typeof processedReplyTo === 'number') {
            // It's just an ID
            processedReplyTo = {
                id: String(processedReplyTo),
                content: 'Message reply', // Fallback if content missing
                senderName: 'User',
                messageType: 'text'
            };
        }

        // Ensure isCorrection flag is propagated into replyTo for UI logic
        if (data.isCorrection && processedReplyTo) {
            processedReplyTo.isCorrection = true;
        }

        // Determine status: Prioritize explicit status, then is_read from DB, then fallback
        let status = data.status;
        if (!status) {
            if (data.is_read !== undefined && data.is_read !== null) {
                const isRead = data.is_read == 1 || data.is_read === true || data.is_read === '1';
                status = isRead ? 'read' : (isSent ? 'sent' : 'read');
            } else {
                status = isSent ? 'sent' : 'read';
            }
        }

        return {
            id: String(data.id),
            roomId: data.roomId,
            senderId: data.sender_id || data.senderId,
            content: content,
            createdAt: createdAt,
            type: isSent ? 'sent' : 'received',
            status: status,
            messageType: msgType,
            replyTo: processedReplyTo,
            originalLang: data.originalLang || data.original_lang,
            translatedContent: data.translatedContent,
            showTranslation: !!data.translatedContent,
            senderName: data.senderName,
            avatar: data.avatar
        };
    }

    private updateReadStatusIfNeeded(msg: ChatMessage) {
        if (msg.type === 'received' && this.currentRoomId() === msg.roomId) {
            // Use visibility API to check if user is actually looking? 
            // For now, assume if room is open, we read it.
            this.socketService.emit('message_read', { roomId: msg.roomId, messageIds: [msg.id] });
        }
    }

    private markAllAsRead(roomId: string) {
        // Find all unread received messages
        const unreadIds = this.messages()
            .filter(m => m.type === 'received' && m.status !== 'read')
            .map(m => m.id);

        if (unreadIds.length > 0) {
            this.socketService.emit('message_read', { roomId, messageIds: unreadIds });
        }
    }
}
