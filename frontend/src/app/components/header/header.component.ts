import { Component, OnInit, signal, inject, HostListener } from '@angular/core';
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
export class HeaderComponent implements OnInit {
    protected isDarkMode = signal(true);
    protected isMobileMenuOpen = signal(false);
    protected unreadCount = signal(0);
    private router = inject(Router);
    private api = inject(ApiService);
    private auth = inject(AuthService);
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
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
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
        // Read saved theme from localStorage (default: dark)
        const savedTheme = localStorage.getItem('theme') ?? 'dark';
        const isDark = savedTheme !== 'light';
        this.isDarkMode.set(isDark);
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        this.currentRoute = this.router.url;

        // Listen for new messages to update unread count
        this.chatStorage.messagesUpdated$.subscribe(() => {
            this.checkUnread();
        });
    }
}
