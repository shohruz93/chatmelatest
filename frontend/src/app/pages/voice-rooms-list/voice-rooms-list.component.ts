import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

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
    filterLang: string = '';
    newRoomTopic: string = '';
    newRoomLang: string = 'EN';
    showCreateModal: boolean = false;

    languages = ['EN', 'RU', 'TJ', 'ES', 'CN', 'AR', 'FR', 'ID', 'JA'];

    filteredRooms = computed(() => {
        const lang = this.filterLang;
        return lang ? this.rooms().filter(r => r.language === lang) : this.rooms();
    });

    private subs: Subscription = new Subscription();

    ngOnInit() {
        this.socketService.getVoiceRooms();

        this.subs.add(this.socketService.voiceRoomsList$.subscribe((data: any) => {
            if (Array.isArray(data)) this.rooms.set(data);
        }));

        // Also update list on live updates
        this.subs.add(this.socketService.voiceRoomsUpdate$.subscribe((data: any) => {
            if (Array.isArray(data)) this.rooms.set(data);
        }));

        // Auto-navigate admin into room right after creation
        this.subs.add(this.socketService.voiceRoomJoined$.subscribe((data: any) => {
            if (data?.roomId) {
                this.router.navigate(['/dashboard/voice-room', data.roomId]);
            }
        }));
    }

    setFilter(lang: string) {
        this.filterLang = lang;
    }

    getAvatarUrl(avatar: string): string {
        if (!avatar) return '';
        if (avatar.startsWith('http')) return avatar;
        return environment.phpBaseUrl + avatar;
    }

    createRoom() {
        if (this.newRoomTopic.trim()) {
            this.socketService.createVoiceRoom(this.newRoomTopic, this.newRoomLang);
            this.newRoomTopic = '';
            this.showCreateModal = false;
        }
    }

    joinRoom(roomId: string) {
        this.router.navigate(['/dashboard/voice-room', roomId]);
    }

    ngOnDestroy() {
        this.subs.unsubscribe();
    }
}
