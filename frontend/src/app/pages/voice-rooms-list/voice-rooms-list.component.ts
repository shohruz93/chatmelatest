import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AdsterraBannerComponent } from '../../components/adsterra-banner/adsterra-banner.component';

@Component({
    selector: 'app-voice-rooms-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, TranslatePipe, AdsterraBannerComponent],
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
    loading: boolean = true;

    languages = ['EN', 'RU', 'TJ', 'ES', 'CN', 'AR', 'FR', 'DE', 'ID', 'JA'];

    filteredRooms = computed(() => {
        const lang = this.filterLang;
        return lang ? this.rooms().filter(r => r.language === lang) : this.rooms();
    });

    private readonly LANG_COLORS: { [k: string]: string } = {
        EN: '#3b82f6',
        RU: '#ef4444',
        TJ: '#22c55e',
        ES: '#f59e0b',
        CN: '#dc2626',
        AR: '#10b981',
        FR: '#8b5cf6',
        DE: '#facc15',
        ID: '#f97316',
        JA: '#ec4899'
    };

    private subs: Subscription = new Subscription();
    private loadingTimer: any = null;

    ngOnInit() {
        this.socketService.getVoiceRooms();

        this.subs.add(this.socketService.voiceRoomsList$.subscribe((data: any) => {
            this.handleRooms(data);
        }));

        this.subs.add(this.socketService.voiceRoomsUpdate$.subscribe((data: any) => {
            this.handleRooms(data);
        }));

        this.subs.add(this.socketService.voiceRoomJoined$.subscribe((data: any) => {
            if (data?.roomId) {
                this.router.navigate(['/dashboard/voice-room', data.roomId]);
            }
        }));

        this.loadingTimer = setTimeout(() => (this.loading = false), 350);
    }

    private handleRooms(data: any) {
        if (Array.isArray(data)) {
            this.rooms.set(data);
            if (this.loadingTimer) {
                clearTimeout(this.loadingTimer);
                this.loadingTimer = null;
            }
            setTimeout(() => (this.loading = false), 100);
        }
    }

    setFilter(lang: string) { this.filterLang = lang; }

    getAvatarUrl(avatar: string): string {
        if (!avatar) return '';
        if (avatar.startsWith('http')) return avatar;
        return environment.phpBaseUrl + avatar;
    }

    getLangColor(code: string): string {
        return this.LANG_COLORS[code?.toUpperCase()] || '#818cf8';
    }

    createRoom() {
        if (this.newRoomTopic.trim()) {
            this.socketService.createVoiceRoom(this.newRoomTopic.trim(), this.newRoomLang);
            this.newRoomTopic = '';
            this.showCreateModal = false;
        }
    }

    joinRoom(roomId: string) {
        this.router.navigate(['/dashboard/voice-room', roomId]);
    }

    ngOnDestroy() {
        this.subs.unsubscribe();
        if (this.loadingTimer) clearTimeout(this.loadingTimer);
    }
}