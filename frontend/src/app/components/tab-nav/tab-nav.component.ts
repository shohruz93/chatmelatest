import { Component, signal, inject } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { CallService } from '../../services/call.service';

@Component({
    selector: 'app-tab-nav',
    standalone: true,
    imports: [RouterModule, CommonModule, TranslatePipe],
    templateUrl: './tab-nav.component.html',
    styleUrl: './tab-nav.component.css'
})
export class TabNavComponent {
    private router = inject(Router);
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private socketService = inject(SocketService);
    public callService = inject(CallService);
    protected unreadCount = signal(0);
    protected newGuestsCount = signal(0);
    currentRoute = '';

    constructor() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            this.currentRoute = event.urlAfterRedirects;
            this.checkUnread();
            this.checkNewGuests();
        });

        // Real-time unread updates
        this.socketService.on('message').subscribe({
            next: () => this.checkUnread()
        });

        this.checkUnread();
        this.checkNewGuests();
    }

    checkNewGuests() {
        const user = this.auth.currentUserValue;
        if (user) {
            this.api.getNewGuestsCount(user.id).subscribe({
                next: (data: any) => {
                    this.newGuestsCount.set(data.count || 0);
                },
                error: () => this.newGuestsCount.set(0)
            });
        }
    }

    checkUnread() {
        const user = this.auth.currentUserValue;
        if (user) {
            this.api.get(`/conversations?userId=${user.id}`).subscribe({
                next: (data: any) => {
                    const total = data.reduce((acc: number, curr: any) => acc + parseInt(curr.unread_count || 0), 0);
                    this.unreadCount.set(total);
                },
                error: () => this.unreadCount.set(0)
            });
        }
    }

    isActive(route: string): boolean {
        if (route === '/chat') {
            return this.currentRoute === '/chat' || this.currentRoute.startsWith('/chat/');
        }
        return this.currentRoute.startsWith(route);
    }
}
