import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <!-- Sidebar -->
      <aside 
        [class.translate-x-0]="sidebarOpen()"
        [class.-translate-x-full]="!sidebarOpen()"
        class="fixed md:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out md:translate-x-0"
      >
        <!-- Logo Section -->
        <div class="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8">
          <div class="absolute inset-0 bg-black opacity-10"></div>
          <div class="relative z-10">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <i class="fas fa-shield-alt text-2xl text-white"></i>
              </div>
              <div>
                <h1 class="text-2xl font-bold text-white">Chatme</h1>
                <p class="text-xs text-white/80 font-medium">Admin Panel</p>
              </div>
            </div>
          </div>
          <!-- Decorative circles -->
          <div class="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        <!-- Navigation -->
        <nav class="mt-8 px-4 space-y-2">
          <a 
            routerLink="/admin/dashboard" 
            routerLinkActive="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/50"
            [routerLinkActiveOptions]="{exact: false}"
            class="group flex items-center px-4 py-3.5 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-500 hover:text-white rounded-xl transition-all duration-200 font-medium"
          >
            <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 group-hover:bg-white/20 transition-colors">
              <i class="fas fa-chart-line text-lg text-indigo-600 dark:text-indigo-400 group-hover:text-white"></i>
            </div>
            <span class="ml-4">Dashboard</span>
            <i class="fas fa-chevron-right ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
          </a>

          <a 
            routerLink="/admin/users" 
            routerLinkActive="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/50"
            [routerLinkActiveOptions]="{exact: false}"
            class="group flex items-center px-4 py-3.5 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-500 hover:text-white rounded-xl transition-all duration-200 font-medium"
          >
            <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 group-hover:bg-white/20 transition-colors">
              <i class="fas fa-users text-lg text-purple-600 dark:text-purple-400 group-hover:text-white"></i>
            </div>
            <span class="ml-4">Users</span>
            <i class="fas fa-chevron-right ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
          </a>

          <a 
            routerLink="/admin/messages" 
            routerLinkActive="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/50"
            [routerLinkActiveOptions]="{exact: false}"
            class="group flex items-center px-4 py-3.5 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-500 hover:text-white rounded-xl transition-all duration-200 font-medium"
          >
            <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/30 group-hover:bg-white/20 transition-colors">
              <i class="fas fa-comments text-lg text-pink-600 dark:text-pink-400 group-hover:text-white"></i>
            </div>
            <span class="ml-4">Messages</span>
            <i class="fas fa-chevron-right ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
          </a>
        </nav>

        <!-- Logout Button -->
        <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <button 
            (click)="logout()"
            class="w-full flex items-center px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 font-medium group"
          >
            <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
              <i class="fas fa-sign-out-alt text-lg"></i>
            </div>
            <span class="ml-4">Logout</span>
          </button>
        </div>
      </aside>

      <!-- Overlay for mobile -->
      <div 
        *ngIf="sidebarOpen()"
        (click)="toggleSidebar()"
        class="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
      ></div>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Header -->
        <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 z-30">
          <div class="flex items-center justify-between px-6 py-4">
            <!-- Mobile menu button -->
            <button 
              (click)="toggleSidebar()"
              class="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <i class="fas fa-bars text-xl"></i>
            </button>

            <!-- Search Bar -->
            <div class="hidden md:flex flex-1 max-w-xl">
              <div class="relative w-full">
                <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="text" 
                  placeholder="Search users, messages..." 
                  class="w-full pl-12 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-gray-800 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-600 transition-all"
                >
              </div>
            </div>

            <!-- Right Section -->
            <div class="flex items-center space-x-4 ml-auto">
              <!-- Notifications -->
              <button class="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <i class="fas fa-bell text-xl"></i>
                <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <!-- Theme Toggle -->
              <button class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <i class="fas fa-moon text-xl"></i>
              </button>

              <!-- Admin Profile -->
              <div class="flex items-center space-x-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                <div class="text-right hidden sm:block">
                  <div class="text-sm font-semibold text-gray-800 dark:text-white">Admin User</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Administrator</div>
                </div>
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
                  A
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-6">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AdminLayoutComponent {
  sidebarOpen = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  toggleSidebar() {
    this.sidebarOpen.update(value => !value);
  }

  logout() {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}
