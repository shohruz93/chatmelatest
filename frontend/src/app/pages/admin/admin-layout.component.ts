import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div [class.dark]="isDarkMode" class="font-sans antialiased selection:bg-primary-500/30 selection:text-primary-500 h-screen overflow-hidden">
      <div class="flex h-screen bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-500">
        
        <!-- Sidebar -->
        <aside class="w-72 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-2xl border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col hidden md:flex z-30 transition-all duration-300 shadow-[20px_0_40px_-20px_rgba(0,0,0,0.05)] relative overflow-hidden">
          
          <!-- Subtle glow effect in sidebar -->
          <div class="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary-500/10 to-transparent pointer-events-none"></div>

          <div class="p-8 pb-4 relative z-10">
             <div class="flex items-center gap-4 mb-10">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-primary-500/30 rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300">
                  <i class="fi fi-sr-bolt text-xl"></i>
                </div>
                <div>
                  <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">CHATME</h1>
                  <span class="text-[10px] font-bold text-primary-500 tracking-[0.3em] uppercase opacity-80">Workspace</span>
                </div>
             </div>

             <div class="space-y-1">
               <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 mb-3">Core</p>
               <nav class="space-y-1.5">
                 <a routerLink="/admin/dashboard" routerLinkActive="bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 !font-semibold shadow-sm" 
                    class="flex items-center px-4 py-3.5 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-300 group border border-transparent router-link-active:border-primary-500/20">
                   <div class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 group-hover:scale-110 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-all duration-300">
                     <i class="fi fi-rr-apps text-lg opacity-70 group-hover:text-primary-500 group-hover:opacity-100"></i>
                   </div>
                   Dashboard
                 </a>
                 <a routerLink="/admin/users" routerLinkActive="bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 !font-semibold shadow-sm" 
                    class="flex items-center px-4 py-3.5 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-300 group border border-transparent router-link-active:border-primary-500/20">
                   <div class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 group-hover:scale-110 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-all duration-300">
                     <i class="fi fi-rr-users text-lg opacity-70 group-hover:text-primary-500 group-hover:opacity-100"></i>
                   </div>
                   Users Matrix
                 </a>
               </nav>
             </div>

             <div class="mt-10 space-y-1">
               <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 mb-3">Operations</p>
               <nav class="space-y-1.5">
                 <a routerLink="/admin/support" routerLinkActive="bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 !font-semibold shadow-sm" 
                    class="flex items-center px-4 py-3.5 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-300 group border border-transparent router-link-active:border-primary-500/20">
                    <div class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 group-hover:scale-110 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-all duration-300">
                      <i class="fi fi-rr-headset text-lg opacity-70 group-hover:text-primary-500 group-hover:opacity-100"></i>
                    </div>
                    Support Desk
                 </a>
                 <a routerLink="/admin/apps" routerLinkActive="bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 !font-semibold shadow-sm" 
                    class="flex items-center px-4 py-3.5 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-300 group border border-transparent router-link-active:border-primary-500/20">
                    <div class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 group-hover:scale-110 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-all duration-300">
                      <i class="fi fi-rr-rocket text-lg opacity-70 group-hover:text-primary-500 group-hover:opacity-100"></i>
                    </div>
                    App Registry
                 </a>
                 <a routerLink="/admin/community" routerLinkActive="bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 !font-semibold shadow-sm" 
                    class="flex items-center px-4 py-3.5 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-300 group border border-transparent router-link-active:border-primary-500/20">
                    <div class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 group-hover:scale-110 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-all duration-300">
                      <i class="fi fi-rr-globe text-lg opacity-70 group-hover:text-primary-500 group-hover:opacity-100"></i>
                    </div>
                    Community
                 </a>
               </nav>
             </div>

             <!-- AI Chat Separator -->
             <div class="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800/80">
               <nav>
                 <a routerLink="/admin/ai-chat" routerLinkActive="bg-gradient-to-r from-purple-500/10 to-primary-500/10 text-purple-600 dark:text-purple-400 !font-semibold shadow-sm" 
                    class="flex items-center px-4 py-3.5 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-300 group border border-transparent router-link-active:border-purple-500/20 relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-primary-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <div class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 group-hover:scale-110 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-all duration-300 relative z-10">
                      <i class="fi fi-rr-robot text-lg opacity-70 group-hover:text-purple-500 group-hover:opacity-100"></i>
                    </div>
                    <span class="relative z-10">AI Consultant</span>
                    <div class="ml-auto w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                 </a>
               </nav>
             </div>
          </div>

          <div class="mt-auto p-8 pt-4 relative z-10">
               <a routerLink="/" class="flex items-center px-4 py-3.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all duration-300 group border border-transparent hover:border-rose-500/20">
                  <div class="w-8 h-8 rounded-xl flex items-center justify-center mr-3 group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20 transition-colors">
                    <i class="fi fi-rr-sign-out-alt text-lg transition-transform group-hover:-translate-x-1"></i>
                  </div>
                  Terminate Session
               </a>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 overflow-hidden flex flex-col relative bg-slate-50/50 dark:bg-[#0B0F19]">
          
          <!-- Decorative Background Elements -->
          <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

          <!-- Top bar -->
          <header class="h-24 px-10 flex items-center justify-between shrink-0 z-20 relative">
            <div class="flex items-center gap-4">
              <h2 class="text-2xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                 Command Center
              </h2>
            </div>
            
            <div class="flex items-center gap-6">
              <!-- Theme Toggle -->
              <button (click)="toggleTheme()" class="w-12 h-12 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 hover:scale-105 hover:shadow-lg transition-all duration-300">
                 <i class="fi text-xl transition-transform duration-500" [ngClass]="isDarkMode ? 'fi-rr-sun rotate-180' : 'fi-rr-moon'"></i>
              </button>

              <div class="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/50 dark:border-slate-800/50 text-xs font-bold text-slate-500 tracking-wider shadow-sm">
                 <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                 SYS_ONLINE
              </div>
              
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 overflow-hidden ring-4 ring-white dark:ring-[#0B0F19] shadow-lg shadow-black/5 flex items-center justify-center">
                 <span class="text-slate-600 dark:text-slate-400 text-sm font-black tracking-widest">A_</span>
              </div>
            </div>
          </header>

          <div class="flex-1 overflow-y-auto scroll-smooth relative z-10 custom-scrollbar">
            <div class="max-w-[1600px] mx-auto px-10 pb-10">
                <router-outlet></router-outlet>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: rgba(156, 163, 175, 0.3);
      border-radius: 20px;
    }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: rgba(75, 85, 99, 0.4);
    }
  `]
})
export class AdminLayoutComponent {
  isDarkMode = true;

  ngOnInit() {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('adminTheme');
    if (savedTheme) {
      this.isDarkMode = savedTheme === 'dark';
    } else {
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    this.applyTheme();
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('adminTheme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
