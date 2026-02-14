import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-voice-rooms-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './voice-rooms-list.component.html',
    styleUrls: ['./voice-rooms-list.component.css']
})
export class VoiceRoomsListComponent implements OnInit, OnDestroy {
    private socketService = inject(SocketService);
    private router = inject(Router);

    rooms = signal<any[]>([]);
    newRoomTopic: string = '';
    showCreateModal: boolean = false;

    private subs: Subscription = new Subscription();

    ngOnInit() {
        this.socketService.getVoiceRooms();

        this.subs.add(this.socketService.voiceRoomsList$.subscribe((data: any) => {
            // data usually is List<VoiceRoom> or JSONArray
            if (Array.isArray(data)) {
                this.rooms.set(data);
            }
        }));
    }

    createRoom() {
        if (this.newRoomTopic.trim()) {
            this.socketService.createVoiceRoom(this.newRoomTopic);
            this.newRoomTopic = '';
            this.showCreateModal = false;
            // Server usually auto-joins the creator or emits update. 
            // If server auto-joins, we should listen to 'voice_room_joined' globally or just wait for list update?
            // Let's rely on list update for now, or user can click join after it appears.
            // Better yet, in Android `createVoiceRoom` just sends emit. `voice_room_joined` event handles the join.
            // We probably need to handle `voice_room_joined` in app.component or similar if we want auto-navigation?
            // Or we can just let `VoiceRoomComponent` handle join.
            // But if I create a room, I expect to go there.
            // I'll leave it manual for now (Wait for list update, then click join).
        }
    }

    joinRoom(roomId: string) {
        this.router.navigate(['/dashboard/voice-room', roomId]);
    }

    ngOnDestroy() {
        this.subs.unsubscribe();
    }
}
