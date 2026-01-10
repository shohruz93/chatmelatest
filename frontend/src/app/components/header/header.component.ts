import { Component, signal, inject, HostListener } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { LanguageService } from '../../services/language.service';
import { ChatStorageService } from '../../services/chat-storage.service';

import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [RouterModule, CommonModule, TranslatePipe],
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
    private chatStorage = inject(ChatStorageService);
    public languageService = inject(LanguageService);
    currentRoute = '';
    showLangMenu = false;

    constructor() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            this.currentRoute = event.urlAfterRedirects;
            this.checkUnread();
        });
    }

    @HostListener('document:click')
    closeMenu() {
        this.showLangMenu = false;
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

    setLanguage(lang: string) {
        this.languageService.setLanguage(lang);
    }

    closeMobileMenu() {
        this.isMobileMenuOpen.set(false);
    }

    ngOnInit() {
        // Initialize theme based on current state or default
        if (document.documentElement.getAttribute('data-theme') !== 'dark' && this.isDarkMode()) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        this.currentRoute = this.router.url;

        // Listen for new messages to update unread count
        this.chatStorage.messagesUpdated$.subscribe(() => {
            this.checkUnread();
        });
    }
}
