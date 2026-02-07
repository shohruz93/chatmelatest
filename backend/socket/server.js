const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
require('dotenv').config();

const API_URL = process.env.PHP_API_URL || "https://shphbjeio23.chatme.tj";
console.log('Using API_URL:', API_URL);

/**
 * Generic fetch with retry logic and timeout
 */
async function fetchWithRetry(url, options = {}, retries = 3, backoff = 1000) {
    const timeout = options.timeout || 10000; // Default 10s timeout
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const requestOptions = {
        ...options,
        signal: controller.signal
    };

    try {
        const response = await fetch(url, requestOptions);
        clearTimeout(id);

        if (response.ok) {
            if (retries < 3) {
                console.info(`[FETCH] Success on ${url} after retries!`);
            }
            return response;
        }

        if (retries > 0 && (response.status >= 500 || response.status === 429)) {
            console.warn(`[FETCH] Retrying ${url} due to status ${response.status}. Retries left: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }

        return response;
    } catch (err) {
        clearTimeout(id);
        const errorDetail = err.code ? `[${err.code}] ${err.message}` : err.message || 'Unknown Error';

        if (retries > 0) {
            console.warn(`[FETCH] Retrying ${url} due to error: ${errorDetail}. Retries left: ${retries}`);
            if (!err.code && !err.message) {
                console.error('[FETCH] Full error object:', err);
            }
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        console.error(`[FETCH] Final failure for ${url}: ${errorDetail}`);
        throw err;
    }
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Internal endpoint for PHP to send notifications
app.post('/internal/notify', (req, res) => {
    const { userId, type, data } = req.body;
    console.log(`Received notification for userId: ${userId}, type: ${type}`);

    const targetSocketId = onlineUsers.get(parseInt(userId));
    if (targetSocketId) {
        io.to(targetSocketId).emit('notification', { type, data });
        console.log(`Notification sent to socket ${targetSocketId}`);
        res.status(200).send({ status: 'success', message: 'Notification sent' });
    } else {
        console.log(`User ${userId} is not online, notification not sent.`);
        res.status(404).send({ status: 'error', message: 'User not found or offline' });
    }
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e7 // 10MB
});

// Store active users: socketId -> userId
const userSocketMap = new Map();
// Store online users: userId -> socketId
const onlineUsers = new Map();
// Store waiting users: socketId -> { filters, profile, timestamp }
const waitingUsers = new Map();
// Store typing status: roomId -> Set of userIds
const typingUsers = new Map();
// Store active rooms: roomId -> { user1, user2 }
const activeRooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('register', (userId) => {
        userSocketMap.set(socket.id, userId);
        onlineUsers.set(userId, socket.id);

        console.log(`User ${userId} registered with socket ${socket.id}`);

        io.emit('user_status_changed', {
            userId: userId,
            status: 'online',
            timestamp: Math.floor(Date.now() / 1000)
        });
    });

    socket.on('get_online_users', () => {
        const onlineUserIds = Array.from(onlineUsers.keys());
        socket.emit('online_users_list', onlineUserIds);
    });

    socket.on('check_user_status', (userId) => {
        const isOnline = onlineUsers.has(userId);
        socket.emit('user_status_response', {
            userId: userId,
            status: isOnline ? 'online' : 'offline'
        });
    });

    socket.on('find_match', async ({ interests, language, filters, myProfile }) => {
        const userId = userSocketMap.get(socket.id);
        console.log(`User ${userId} looking for match with filters:`, filters);

        // Add user to matchmaking queue
        const queueEntry = {
            userId: userId,
            socketId: socket.id,
            filters: filters || {},
            myProfile: myProfile || {},
            interests: interests || [],
            language: language || 'en',
            timestamp: Date.now(),
            retryCount: 0
        };

        waitingUsers.set(socket.id, queueEntry);

        // Try to find a match immediately
        await tryMatchmaking(socket, queueEntry);
    });

    // Advanced matchmaking function
    async function tryMatchmaking(socket, queueEntry) {
        const userId = queueEntry.userId;
        const filters = queueEntry.filters;

        // Get online user IDs if onlineOnly filter is set
        let onlineIdsParam = '';
        if (filters?.onlineOnly) {
            const onlineUserIds = Array.from(onlineUsers.keys()).filter(id => id != userId);

            if (onlineUserIds.length > 0) {
                onlineIdsParam = `&online_ids=${onlineUserIds.join(',')}`;
            } else {
                socket.emit('no_match_found', { message: 'No online users found' });
                waitingUsers.delete(socket.id);
                return;
            }
        }

        try {
            const genderParam = filters?.gender || 'any';
            const locationParam = filters?.location || 'any';

            // Use advanced compatibility matching
            const response = await fetchWithRetry(
                `${API_URL}/match/compatible?userId=${userId}&gender=${genderParam}&location=${locationParam}&limit=10${onlineIdsParam}`,
                { timeout: 5000 }
            );
            const compatibleUsers = await response.json();

            if (compatibleUsers && compatibleUsers.length > 0) {
                // Check if any compatible users are also in the queue (instant match)
                let instantMatch = null;
                let bestScore = 0;

                for (const candidate of compatibleUsers) {
                    // Check if this user is in the waiting queue
                    for (const [otherSocketId, otherEntry] of waitingUsers.entries()) {
                        if (otherEntry.userId === candidate.id && otherSocketId !== socket.id) {
                            // Check if they also match our criteria
                            const mutualMatch = await checkMutualCompatibility(userId, candidate.id);

                            if (mutualMatch && candidate.compatibility_score > bestScore) {
                                instantMatch = {
                                    candidate: candidate,
                                    otherSocketId: otherSocketId,
                                    otherEntry: otherEntry
                                };
                                bestScore = candidate.compatibility_score;
                            }
                        }
                    }
                }

                if (instantMatch) {
                    // Instant match found! Both users are waiting
                    const { candidate, otherSocketId, otherEntry } = instantMatch;

                    // Remove both from queue
                    waitingUsers.delete(socket.id);
                    waitingUsers.delete(otherSocketId);

                    // Create room
                    const sortedIds = [userId, candidate.id].sort();
                    const roomId = `room_${sortedIds[0]}_${sortedIds[1]}`;

                    socket.join(roomId);
                    io.sockets.sockets.get(otherSocketId)?.join(roomId);

                    activeRooms.set(roomId, { user1: userId, user2: candidate.id });

                    // Record match history
                    await recordMatchHistory(userId, candidate.id, candidate.compatibility_score, candidate.match_reasons);

                    // Notify both users
                    io.to(roomId).emit('match_found', {
                        roomId: roomId,
                        compatibilityScore: candidate.compatibility_score,
                        matchReasons: candidate.match_reasons,
                        breakdown: candidate.breakdown
                    });

                    console.log(`Instant match: ${userId} and ${candidate.id} in ${roomId} (score: ${candidate.compatibility_score})`);
                } else {
                    // No instant match, show the best candidate
                    const targetUser = compatibleUsers[0];
                    const targetUserId = parseInt(targetUser.id);
                    const isOnline = onlineUsers.has(targetUserId);

                    // Send queue position update
                    const queuePosition = getQueuePosition(socket.id);
                    socket.emit('queue_update', {
                        position: queuePosition,
                        totalWaiting: waitingUsers.size,
                        estimatedWaitTime: estimateWaitTime(queuePosition)
                    });

                    socket.emit('random_user_found', {
                        user: targetUser,
                        isOnline: isOnline,
                        compatibilityScore: targetUser.compatibility_score,
                        matchReasons: targetUser.match_reasons,
                        breakdown: targetUser.breakdown
                    });

                    console.log(`Showing candidate to user ${userId}: ${targetUser.name} (score: ${targetUser.compatibility_score})`);
                }
            } else {
                // No matches found, implement smart retry with relaxed filters
                if (queueEntry.retryCount < 2) {
                    queueEntry.retryCount++;

                    // Relax filters on retry
                    if (queueEntry.retryCount === 1) {
                        // First retry: remove location filter
                        queueEntry.filters.location = 'any';
                        socket.emit('match_retry', { message: 'Expanding search area...', retryCount: 1 });
                    } else if (queueEntry.retryCount === 2) {
                        // Second retry: remove all filters except onlineOnly
                        queueEntry.filters.gender = 'any';
                        socket.emit('match_retry', { message: 'Searching all users...', retryCount: 2 });
                    }

                    // Wait a bit before retrying
                    setTimeout(() => {
                        if (waitingUsers.has(socket.id)) {
                            tryMatchmaking(socket, queueEntry);
                        }
                    }, 3000);
                } else {
                    socket.emit('no_match_found', { message: 'No users found matching your criteria' });
                    waitingUsers.delete(socket.id);
                }
            }
        } catch (error) {
            console.error('Error in matchmaking:', error);
            socket.emit('match_error', { message: 'Error finding match' });
            waitingUsers.delete(socket.id);
        }
    }

    // Check mutual compatibility
    async function checkMutualCompatibility(userId1, userId2) {
        try {
            const response = await fetchWithRetry(`${API_URL}/match/compatible?userId=${userId2}&limit=20`, { timeout: 5000 });
            const matches = await response.json();

            // Check if userId1 is in userId2's compatible matches
            return matches.some(match => match.id == userId1);
        } catch (error) {
            console.error('Error checking mutual compatibility:', error);
            return false;
        }
    }

    // Get queue position
    function getQueuePosition(socketId) {
        const entries = Array.from(waitingUsers.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        return entries.findIndex(([id]) => id === socketId) + 1;
    }

    // Estimate wait time based on queue position
    function estimateWaitTime(position) {
        // Rough estimate: 30 seconds per position
        return Math.max(30, position * 30);
    }

    // Record match history
    async function recordMatchHistory(user1Id, user2Id, score, reasons) {
        try {
            await fetchWithRetry(`${API_URL}/match/history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user1Id: user1Id,
                    user2Id: user2Id,
                    compatibilityScore: score,
                    matchReasons: reasons
                })
            });
        } catch (error) {
            console.error('Error recording match history:', error);
        }
    }

    // Send chat request
    socket.on('send_chat_request', ({ targetUserId, myProfile }) => {
        const userId = userSocketMap.get(socket.id);
        console.log(`[SEND_CHAT_REQUEST] From user ${userId} to target ${targetUserId}`);
        console.log(`[SEND_CHAT_REQUEST] My profile:`, myProfile);

        const targetSocketId = onlineUsers.get(targetUserId);
        console.log(`[SEND_CHAT_REQUEST] Target socket ID: ${targetSocketId}`);

        if (targetSocketId) {
            const requesterInfo = {
                userId: userId,
                socketId: socket.id,
                name: myProfile?.name || 'User',
                avatar: myProfile?.avatar || null,
                gender: myProfile?.gender || '',
                location: myProfile?.location || ''
            };

            io.to(targetSocketId).emit('chat_request_received', requesterInfo);
            console.log(`Chat request sent from ${userId} to ${targetUserId}`);

            // Send confirmation back to requester
            socket.emit('chat_request_sent', { targetUserId: targetUserId });
        } else {
            // If user went offline in the meantime
            console.log(`[SEND_CHAT_REQUEST] Target user ${targetUserId} is not online`);
            socket.emit('match_error', { message: 'User is no longer online' });
        }
    });

    // Accept chat request
    socket.on('accept_chat_request', ({ requesterSocketId }) => {
        const userId1 = userSocketMap.get(socket.id);
        const userId2 = userSocketMap.get(requesterSocketId);

        if (!userId1 || !userId2) return;

        const sortedIds = [userId1, userId2].sort();
        const roomId = `room_${sortedIds[0]}_${sortedIds[1]}`;

        socket.join(roomId);
        io.sockets.sockets.get(requesterSocketId)?.join(roomId);

        activeRooms.set(roomId, { user1: userId1, user2: userId2 });

        io.to(roomId).emit('match_found', { roomId });
        console.log(`Chat request accepted: ${userId1} and ${userId2} in ${roomId}`);
    });

    // Reject chat request
    socket.on('reject_chat_request', ({ requesterSocketId }) => {
        io.to(requesterSocketId).emit('chat_request_rejected');
        console.log(`Chat request rejected by ${socket.id}`);
    });

    // Leave chat
    socket.on('leave_chat', ({ roomId }) => {
        const userId = userSocketMap.get(socket.id);
        socket.to(roomId).emit('partner_left', { userId });
        socket.leave(roomId);
        activeRooms.delete(roomId);
        console.log(`User ${userId} left chat ${roomId}`);
    });

    // Join chat (for resuming conversations)
    socket.on('join_chat', ({ roomId }) => {
        const userId = userSocketMap.get(socket.id) || 'unknown';
        socket.join(roomId);
        console.log(`User ${userId} joined chat ${roomId}`);

        // Ensure activeRooms is populated
        if (!activeRooms.has(roomId)) {
            const parts = roomId.split('_');
            if (parts.length === 3) {
                const id1 = parseInt(parts[1]);
                const id2 = parseInt(parts[2]);
                if (!isNaN(id1) && !isNaN(id2)) {
                    activeRooms.set(roomId, { user1: id1, user2: id2 });
                }
            }
        }

        // Notify others in room ensuring we have a complete list
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        if (roomSockets) {
            const usersInRoom = [];
            roomSockets.forEach(socketId => {
                const uid = userSocketMap.get(socketId);
                if (uid) usersInRoom.push(uid);
            });
            io.to(roomId).emit('room_users_update', { roomId, users: usersInRoom });
        }
    });

    socket.on('leave_chat', ({ roomId }) => {
        socket.leave(roomId);
        const userId = userSocketMap.get(socket.id);
        console.log(`User ${userId} left room ${roomId}`);

        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        const usersInRoom = [];
        if (roomSockets) {
            roomSockets.forEach(socketId => {
                const uid = userSocketMap.get(socketId);
                if (uid) usersInRoom.push(uid);
            });
        }
        io.to(roomId).emit('room_users_update', { roomId, users: usersInRoom });
    });

    socket.on('typing', ({ roomId, isTyping }) => {
        const userId = userSocketMap.get(socket.id);
        if (!userId || !roomId) return;

        if (!typingUsers.has(roomId)) {
            typingUsers.set(roomId, new Set());
        }

        const roomTyping = typingUsers.get(roomId);
        if (isTyping) {
            roomTyping.add(userId);
        } else {
            roomTyping.delete(userId);
        }

        socket.to(roomId).emit('user_typing', {
            userId: userId,
            isTyping: isTyping
        });
    });

    socket.on('private_message', async ({ roomId, content, originalLang, type, replyTo, tempId }) => {
        const senderId = userSocketMap.get(socket.id);
        if (!senderId) return;

        const room = activeRooms.get(roomId);
        console.log(`Sending message in room ${roomId}. Room data:`, room);

        let receiverId = null;
        if (room) {
            receiverId = room.user1 == senderId ? room.user2 : room.user1;
        } else {
            // Try to extract from roomId (format: room_ID1_ID2)
            const parts = roomId.split('_');
            if (parts.length === 3) {
                const id1 = parseInt(parts[1]);
                const id2 = parseInt(parts[2]);
                if (!isNaN(id1) && !isNaN(id2)) {
                    receiverId = (id1 == senderId) ? id2 : id1;
                    console.log(`Recovered receiverId ${receiverId} from roomId ${roomId}`);
                }
            }
        }

        console.log(`Final receiverId: ${receiverId}`);
        const replyToMessageId = replyTo ? replyTo.id : null;
        const isCorrection = replyTo?.isCorrection || false;

        const messageData = {
            senderId: senderId,
            receiverId: receiverId,
            roomId: roomId,
            content,
            originalLang,
            type: type || 'text',
            timestamp: Math.floor(Date.now() / 1000),
            replyTo: replyTo,
            isCorrection: isCorrection,
            tempId: tempId // Include tempId for optimistic UI updates
        };

        // Save message via PHP API
        try {
            const response = await fetchWithRetry(`${API_URL}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: senderId,
                    receiverId: receiverId,
                    roomId: roomId,
                    content: content,
                    originalLang: originalLang,
                    type: type || 'text',
                    replyToMessageId: replyToMessageId,
                    isCorrection: isCorrection
                }),
                timeout: 8000 // 8s timeout for message saving
            });

            const responseText = await response.text();
            let result = {};

            if (responseText) {
                try {
                    result = JSON.parse(responseText);
                } catch (parseErr) {
                    console.error('Failed to parse PHP API response:', responseText);
                }
            }

            if (response.ok && result.id) {
                messageData.id = result.id;
                if (result.timestamp) {
                    messageData.timestamp = result.timestamp;
                }
            } else {
                console.error('PHP API error saving message:', result, 'Status:', response.status);
            }
        } catch (err) {
            console.error('Error calling PHP API to save message:', err);
        }

        // Broadcast to the room (to receiver only, sender already has it)
        socket.to(roomId).emit('message', messageData);

        // Acknowledge sender with saved message data (id assigned by PHP API) and tempId
        try {
            io.to(socket.id).emit('message_sent', messageData);
        } catch (err) {
            console.error('Error emitting message_sent to sender:', err);
        }

        console.log('[MESSAGE_SENT] Broadcasting to room and acking sender:', roomId, messageData);
    });

    socket.on('edit_message', async ({ roomId, messageId, content }) => {
        console.log(`[EDIT_MESSAGE] Message ${messageId} in room ${roomId}: ${content}`);
        try {
            const response = await fetchWithRetry(`${API_URL}/messages`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: messageId, content }),
                timeout: 5000
            });
            if (response.ok) {
                socket.to(roomId).emit('message_edited', { messageId, content });
            }
        } catch (err) {
            console.error('Error editing message:', err);
        }
    });

    socket.on('delete_message', async ({ roomId, messageId }) => {
        console.log(`[DELETE_MESSAGE] Message ${messageId} in room ${roomId}`);
        try {
            const response = await fetchWithRetry(`${API_URL}/messages`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: messageId }),
                timeout: 5000
            });
            if (response.ok) {
                socket.to(roomId).emit('message_deleted', { messageId });
            }
        } catch (err) {
            console.error('Error deleting message:', err);
        }
    });

    socket.on('load_messages', async ({ roomId, limit = 50, offset = 0 }) => {
        try {
            const response = await fetchWithRetry(`${API_URL}/messages/room?roomId=${roomId}&limit=${limit}&offset=${offset}`, { timeout: 7000 });
            const messages = await response.json();

            if (Array.isArray(messages)) {
                // Normalize message format for IndexedDB storage
                const normalizedMessages = messages.map(msg => {
                    let type = msg.type || msg.messageType || 'text';
                    if (type === 'text' && msg.content) {
                        if (msg.content.startsWith('data:image')) type = 'image';
                        else if (msg.content.startsWith('data:audio')) type = 'audio';
                    }
                    return {
                        ...msg,
                        roomId: msg.roomId || msg.room_id || roomId,
                        created_at: msg.created_at || (msg.timestamp ? msg.timestamp * 1000 : Date.now()),
                        sender_id: msg.sender_id || msg.senderId,
                        messageType: type,
                        id: String(msg.id)
                    };
                });

                socket.emit('messages_loaded', {
                    roomId: roomId,
                    messages: normalizedMessages.reverse()
                });
            } else {
                console.error('Invalid messages format from API:', messages);
                socket.emit('messages_error', { error: 'Failed to load messages' });
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            socket.emit('messages_error', { error: 'Failed to load messages' });
        }
    });

    socket.on('sync_messages', async ({ roomId, lastMessageId }) => {
        try {
            // Fetch recent messages to check for updates/new items
            // We fetch 50 to cover a reasonable gap
            const limit = 20;
            const response = await fetchWithRetry(`${API_URL}/messages/room?roomId=${roomId}&limit=${limit}&offset=0`, { timeout: 7000 });
            const messages = await response.json();

            if (Array.isArray(messages)) {
                // Normalize first
                const normalizedMessages = messages.map(msg => {
                    let type = msg.type || msg.messageType || 'text';
                    if (type === 'text' && msg.content) {
                        if (msg.content.startsWith('data:image')) type = 'image';
                        else if (msg.content.startsWith('data:audio')) type = 'audio';
                    }
                    return {
                        ...msg,
                        roomId: msg.roomId || msg.room_id || roomId,
                        created_at: msg.created_at || (msg.timestamp ? msg.timestamp * 1000 : Date.now()),
                        sender_id: msg.sender_id || msg.senderId,
                        messageType: type,
                        id: String(msg.id)
                    };
                });

                let newMessages = [];

                if (lastMessageId) {
                    // API typically returns newest first.
                    // Collect messages until we hit the lastMessageId
                    const lastIdStr = String(lastMessageId);
                    for (const msg of normalizedMessages) {
                        if (String(msg.id) === lastIdStr) break;
                        newMessages.push(msg);
                    }
                    // Reverse to get chronological order (Oldest -> Newest)
                    newMessages.reverse();
                } else {
                    // Initial sync or lost state: return last 20 as requested
                    newMessages = normalizedMessages.slice(0, 20).reverse();
                }

                socket.emit('sync_response', {
                    roomId,
                    newMessages,
                    updatedMessages: [], // API doesn't support delta updates yet
                    deletedMessageIds: []
                });
            } else {
                // Even if API fails, emit empty response to stop loading spinner
                socket.emit('sync_response', {
                    roomId,
                    newMessages: [],
                    updatedMessages: [],
                    deletedMessageIds: []
                });
            }
        } catch (error) {
            console.error('Error syncing messages:', error);
            // Emit empty response to stop loading spinner on error
            socket.emit('sync_response', {
                roomId,
                newMessages: [],
                updatedMessages: [],
                deletedMessageIds: []
            });
        }
    });

    socket.on('get_room_details', async ({ roomId }) => {
        let room = activeRooms.get(roomId);

        // If room not active, try to parse from roomId
        if (!room) {
            const parts = roomId.split('_');
            if (parts.length === 3) {
                const id1 = parseInt(parts[1]);
                const id2 = parseInt(parts[2]);
                if (!isNaN(id1) && !isNaN(id2)) {
                    room = { user1: id1, user2: id2 };
                    // Optionally restore to activeRooms
                    activeRooms.set(roomId, room);
                }
            }
        }

        if (!room) return;

        try {
            const { user1, user2 } = room;

            // Fetch profiles
            const [profile1Res, profile2Res] = await Promise.all([
                fetchWithRetry(`${API_URL}/profile?userId=${user1}`, { timeout: 5000 }),
                fetchWithRetry(`${API_URL}/profile?userId=${user2}`, { timeout: 5000 })
            ]);

            const profile1 = await profile1Res.json();
            const profile2 = await profile2Res.json();

            socket.emit('room_details', {
                roomId,
                participants: [profile1, profile2]
            });
        } catch (error) {
            console.error('Error fetching room details:', error);
        }
    });

    // Mark messages as read
    socket.on('mark_as_read', async ({ roomId, senderId }) => {
        const userId = userSocketMap.get(socket.id);
        if (!userId) return;

        try {
            // Call PHP API to mark messages as read
            const response = await fetchWithRetry(`${API_URL}/conversations/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    otherUserId: senderId
                }),
                timeout: 5000
            });

            if (response.ok) {
                console.log(`Marked messages from ${senderId} as read for user ${userId}`);

                // Notify the sender that their messages have been read.
                // Prefer sending directly to the sender's socket (they may not be joined to the room).
                const senderSocketId = onlineUsers.get(senderId);
                if (senderSocketId) {
                    io.to(senderSocketId).emit('message_read', {
                        roomId: roomId,
                        readBy: userId
                    });
                } else {
                    // Fallback: broadcast to the room (excludes the current socket)
                    socket.to(roomId).emit('message_read', {
                        roomId: roomId,
                        readBy: userId
                    });
                }
            } else {
                console.error('Failed to mark messages as read:', await response.text());
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    });

    // Handle translation requests
    socket.on('translate_message', async ({ messageId, text, targetLang }) => {
        console.log(`[TRANSLATE] Request for message ${messageId} to ${targetLang}`);

        // Normalize language codes (e.g., 'tj' -> 'tg' for better compatibility)
        let dl = targetLang;
        if (targetLang === 'tj') dl = 'tg';

        try {
            let translatedText = null;

            // Attempt 1: Custom API (ftapi.pythonanywhere.com)
            try {
                const primaryUrl = `https://ftapi.pythonanywhere.com/translate?sl=auto&dl=${dl}&text=${encodeURIComponent(text)}`;
                console.log('[TRANSLATE] Attempting Primary API:', primaryUrl);

                const response = await fetchWithRetry(primaryUrl, { timeout: 5000 });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data['destination-text']) {
                        translatedText = data['destination-text'];
                    } else if (data && data.translatedText) {
                        translatedText = data.translatedText;
                    }
                }
            } catch (err) {
                console.warn('[TRANSLATE] Primary API failed:', err.message);
            }

            // Attempt 2: Fallback to Google Translate Unofficial API (Stable & Free)
            if (!translatedText) {
                try {
                    const fallbackUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${dl}&dt=t&q=${encodeURIComponent(text)}`;
                    console.log('[TRANSLATE] Attempting Fallback API:', fallbackUrl);

                    const response = await fetchWithRetry(fallbackUrl, { timeout: 5000 });
                    if (response.ok) {
                        const data = await response.json();
                        // Google Translate response is a nested array: [[["translated", "orig", ...]]]
                        if (data && data[0] && data[0][0] && data[0][0][0]) {
                            translatedText = data[0][0][0];
                        }
                    }
                } catch (err) {
                    console.error('[TRANSLATE] Fallback API failed:', err.message);
                }
            }

            if (translatedText) {
                socket.emit('translation_result', {
                    messageId: messageId,
                    success: true,
                    translatedText: translatedText
                });

                // Track Polyglot mission (translate_message)
                const userId = userSocketMap.get(socket.id);
                if (userId) {
                    fetchWithRetry(`${API_URL}/gamification/track`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: userId,
                            conditionKey: 'translate_message'
                        }),
                        timeout: 3000
                    }).catch(err => console.error('Error tracking translation progress:', err));
                }
            } else {
                throw new Error('All translation services failed or returned invalid response.');
            }
        } catch (error) {
            console.error('[TRANSLATE] Fatal Error:', error);
            socket.emit('translation_result', {
                messageId: messageId,
                success: false,
                error: 'Translation error: ' + (error.message || 'Service unavailable')
            });
        }
    });

    // Checkers Game Events
    socket.on('checkers_invite', ({ targetUserId, amount }) => {
        const senderId = userSocketMap.get(socket.id);
        const targetSocketId = onlineUsers.get(targetUserId);

        if (!targetSocketId) {
            socket.emit('checkers_error', { message: 'User is offline' });
            return;
        }

        // Validate that both users are in the same chat room
        const sortedIds = [senderId, targetUserId].sort();
        const expectedRoomId = `room_${sortedIds[0]}_${sortedIds[1]}`;

        // Check if the room exists in activeRooms
        const room = activeRooms.get(expectedRoomId);
        if (!room) {
            socket.emit('checkers_error', { message: 'You must be in an active chat with this user to invite them to a game' });
            return;
        }

        // Verify both users are actually in the room
        const roomSockets = io.sockets.adapter.rooms.get(expectedRoomId);
        if (!roomSockets || !roomSockets.has(socket.id) || !roomSockets.has(targetSocketId)) {
            socket.emit('checkers_error', { message: 'Both users must be in the chat room to start a game' });
            return;
        }

        io.to(targetSocketId).emit('checkers_invite_received', {
            fromUserId: senderId,
            amount: amount,
            socketId: socket.id
        });
    });

    socket.on('checkers_reject', ({ requesterSocketId }) => {
        io.to(requesterSocketId).emit('checkers_rejected', {
            byUserId: userSocketMap.get(socket.id)
        });
    });

    socket.on('checkers_cancel', ({ targetUserId }) => {
        const targetSocketId = onlineUsers.get(targetUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('checkers_cancelled', {
                byUserId: userSocketMap.get(socket.id)
            });
        }
    });

    socket.on('checkers_accept', ({ requesterSocketId, amount }) => {
        const userId1 = userSocketMap.get(socket.id);
        const userId2 = userSocketMap.get(requesterSocketId);

        if (!userId1 || !userId2) {
            socket.emit('checkers_error', { message: 'Invalid player connection' });
            return;
        }

        const roomId = `checkers_${Math.min(userId1, userId2)}_${Math.max(userId1, userId2)}_${Date.now()}`;

        // Join both players to the room
        socket.join(roomId);
        const requesterSocket = io.sockets.sockets.get(requesterSocketId);
        if (!requesterSocket) {
            socket.emit('checkers_error', { message: 'Requester is no longer connected' });
            return;
        }
        requesterSocket.join(roomId);

        // Prepare game start data
        const gameData = {
            roomId,
            players: [userId1, userId2],
            amount,
            turn: userId2 // Requester starts
        };

        console.log(`Checkers game started in room ${roomId}`);

        // Emit to each player individually to ensure delivery
        // This prevents race conditions where players might not be fully in the room yet
        io.to(socket.id).emit('checkers_start', gameData);
        io.to(requesterSocketId).emit('checkers_start', gameData);

        // Also emit to room as backup
        io.to(roomId).emit('checkers_start', gameData);
    });

    socket.on('join_checkers_game', ({ roomId }) => {
        const userId = userSocketMap.get(socket.id);
        if (userId) {
            socket.join(roomId);
            console.log(`[CHECKERS] User ${userId} (${socket.id}) explicitly joined room ${roomId}`);

            // Optional: Broadcast that user re-connected/joined?
            // socket.to(roomId).emit('checkers_user_joined', { userId });
        }
    });

    socket.on('checkers_move', ({ roomId, move }) => {
        const senderId = userSocketMap.get(socket.id);
        console.log(`[CHECKERS_MOVE] Received from userId ${senderId} in room ${roomId}`);
        console.log(`[CHECKERS_MOVE] Move data:`, JSON.stringify(move));

        // Get room members to verify
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        if (roomSockets) {
            console.log(`[CHECKERS_MOVE] Room ${roomId} has ${roomSockets.size} members`);
            const members = [];
            roomSockets.forEach(socketId => {
                const userId = userSocketMap.get(socketId);
                members.push({ socketId: socketId.substring(0, 8), userId });
            });
            console.log(`[CHECKERS_MOVE] Room members:`, members);
        } else {
            console.log(`[CHECKERS_MOVE] ERROR: Room ${roomId} does not exist!`);
        }

        socket.to(roomId).emit('checkers_move', { senderId, move });
        console.log(`[CHECKERS_MOVE] Broadcasted to room ${roomId} (excluding sender)`);
    });

    socket.on('checkers_chat', ({ roomId, message }) => {
        const senderId = userSocketMap.get(socket.id);
        io.to(roomId).emit('checkers_chat', { senderId, message, timestamp: Date.now() });
    });

    socket.on('checkers_game_over', ({ roomId, winnerId }) => {
        io.to(roomId).emit('checkers_game_over', { winnerId });
        // The client will handle the API call to /games/win for the winner
    });

    // Voice Chat Signaling
    socket.on('voice_offer', ({ targetUserId, offer }) => {
        const senderId = userSocketMap.get(socket.id);
        const targetSocketId = onlineUsers.get(targetUserId);

        if (!targetSocketId) {
            socket.emit('voice_error', {
                message: 'Target user is not available for voice chat',
                targetUserId
            });
            return;
        }

        io.to(targetSocketId).emit('voice_offer', {
            senderId: senderId,
            offer: offer
        });
        console.log(`[Voice] Offer sent from ${senderId} to ${targetUserId}`);
    });

    socket.on('voice_answer', ({ targetUserId, answer }) => {
        const senderId = userSocketMap.get(socket.id);
        const targetSocketId = onlineUsers.get(targetUserId);

        if (!targetSocketId) {
            socket.emit('voice_error', {
                message: 'Target user is not available for voice chat',
                targetUserId
            });
            return;
        }

        io.to(targetSocketId).emit('voice_answer', {
            senderId: senderId,
            answer: answer
        });
        console.log(`[Voice] Answer sent from ${senderId} to ${targetUserId}`);
    });

    socket.on('voice_candidate', ({ targetUserId, candidate }) => {
        const senderId = userSocketMap.get(socket.id);
        const targetSocketId = onlineUsers.get(targetUserId);

        if (!targetSocketId) {
            // Silently ignore missing candidates as they may arrive after disconnect
            console.log(`[Voice] Candidate ignored - target ${targetUserId} not online`);
            return;
        }

        io.to(targetSocketId).emit('voice_candidate', {
            senderId: senderId,
            candidate: candidate
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        const userId = userSocketMap.get(socket.id);
        if (userId) {
            setTimeout(() => {
                if (onlineUsers.get(userId) === socket.id) {
                    onlineUsers.delete(userId);

                    io.emit('user_status_changed', {
                        userId: userId,
                        status: 'offline',
                        lastSeen: Math.floor(Date.now() / 1000)
                    });
                }
            }, 5000);
        }

        userSocketMap.delete(socket.id);
        waitingUsers.delete(socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Socket server running on port ${PORT}`);
});
