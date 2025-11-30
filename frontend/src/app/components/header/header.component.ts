import { Component, signal, inject } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [RouterModule, CommonModule],
    templateUrl: './header.component.html',
    styleUrl: './header.component.css'
})
export class HeaderComponent {
    protected isDarkMode = signal(true);
    protected isMobileMenuOpen = signal(false);
    protected unreadCount = signal(0);
    private router = inject(Router);
    private api = inject(ApiService); // Assuming ApiService is available in same scope or imported
    private auth = inject(AuthService); // Need auth to get user ID
    private socketService = inject(SocketService);
    currentRoute = '';

    constructor() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            this.currentRoute = event.urlAfterRedirects;
            this.checkUnread();
        });
    }

    checkUnread() {
        const user = this.auth.currentUserValue;
        if (user) {
            this.api.get(`/conversations?userId=${user.id}`).subscribe({
                next: (data: any) => {
                    // Sum up unread counts
                    const total = data.reduce((acc: number, curr: any) => acc + parseInt(curr.unread_count), 0);
                    this.unreadCount.set(total);
                },
                error: () => this.unreadCount.set(0)
            });
        }
    }

    isActive(route: string): boolean {
        if (route === '/') {
            return this.currentRoute === '/' || this.currentRoute === '/home';
        }
        return this.currentRoute.startsWith(route);
    }

    toggleTheme() {
        this.isDarkMode.set(!this.isDarkMode());
        if (this.isDarkMode()) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    toggleMobileMenu() {
        this.isMobileMenuOpen.set(!this.isMobileMenuOpen());
    }

    closeMobileMenu() {
        this.isMobileMenuOpen.set(false);
    }

    ngOnInit() {
        // Initialize theme based on current state or default
        // Assuming default is dark as per original code
        if (document.documentElement.getAttribute('data-theme') !== 'dark' && this.isDarkMode()) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        this.currentRoute = this.router.url;

        // Listen for new messages to update unread count
        this.socketService.onMessage().subscribe(() => {
            // If we are not on the chat page, or (TODO: check if message is for current room), increment
            // For now, just increment as the API checkUnread handles the reset when navigating
            if (!this.currentRoute.includes('/chat')) {
                this.unreadCount.update(count => count + 1);
            } else {
                // If we are on chat page, we might want to check if it's the active room
                // But for now, let's rely on the fact that if we are on chat, we probably read it?
                // Actually, if we are on /chat but not in a room, or in a different room...
                // Simpler approach: Just increment if not on /chat for now.
                // Or better: re-fetch unread count? No, that's an API call.
                // Let's just increment.
                this.checkUnread();
            }
        });
    }
}
