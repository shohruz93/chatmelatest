import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-slate-50 dark:bg-[#0b0e14] font-sans selection:bg-blue-100 selection:text-blue-700">
      <!-- Sidebar -->
      <aside class="w-72 bg-white dark:bg-[#151921] border-r border-slate-200 dark:border-slate-800/50 flex flex-col hidden md:flex z-30 transition-all duration-300 shadow-[20px_0_40px_-20px_rgba(0,0,0,0.05)]">
        <div class="p-8 pb-4">
           <div class="flex items-center gap-3 mb-8">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 rotate-3 group-hover:rotate-0 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h1 class="text-xl font-black tracking-tight text-slate-800 dark:text-white leading-tight">CHATME</h1>
                <span class="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-[0.2em] uppercase opacity-70">Admin Panel</span>
              </div>
           </div>

           <div class="space-y-1">
             <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 mb-2">Main Menu</p>
             <nav class="space-y-1">
               <a routerLink="/admin/dashboard" routerLinkActive="bg-blue-50/80 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 !font-semibold border-r-4 border-blue-600 dark:border-blue-500 shadow-sm" 
                  class="flex items-center px-4 py-3 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 group border-r-4 border-transparent">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 opacity-70 group-hover:scale-110 transition-transform group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
                 Dashboard
               </a>
               <a routerLink="/admin/users" routerLinkActive="bg-blue-50/80 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 !font-semibold border-r-4 border-blue-600 dark:border-blue-500 shadow-sm" 
                  class="flex items-center px-4 py-3 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 group border-r-4 border-transparent">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 opacity-70 group-hover:scale-110 transition-transform group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                 </svg>
                 Users
               </a>
             </nav>
           </div>

           <div class="mt-8 space-y-1">
             <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 mb-2">Comms</p>
             <nav class="space-y-1">
               <a routerLink="/admin/support" routerLinkActive="bg-blue-50/80 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 !font-semibold border-r-4 border-blue-600 dark:border-blue-500 shadow-sm" 
                  class="flex items-center px-4 py-3 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 group border-r-4 border-transparent">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 opacity-70 group-hover:scale-110 transition-transform group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Support Chat
               </a>
               <a routerLink="/admin/apps" routerLinkActive="bg-blue-50/80 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 !font-semibold border-r-4 border-blue-600 dark:border-blue-500 shadow-sm" 
                  class="flex items-center px-4 py-3 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 group border-r-4 border-transparent">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 opacity-70 group-hover:scale-110 transition-transform group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  App Registry
               </a>
               <a routerLink="/admin/community" routerLinkActive="bg-blue-50/80 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 !font-semibold border-r-4 border-blue-600 dark:border-blue-500 shadow-sm" 
                  class="flex items-center px-4 py-3 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 group border-r-4 border-transparent">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 opacity-70 group-hover:scale-110 transition-transform group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Community
               </a>
             </nav>
           </div>
        </div>

        <div class="mt-auto p-8 pt-4">
             <a routerLink="/" class="flex items-center px-4 py-3 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-500/5 rounded-xl transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Exit Admin
             </a>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 overflow-hidden flex flex-col relative">
        <!-- Top bar -->
        <header class="h-20 bg-white/80 dark:bg-[#151921]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/50 flex items-center justify-between px-10 shrink-0 z-20 sticky top-0">
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <span class="w-1.5 h-6 bg-blue-600 dark:bg-blue-500 rounded-full"></span>
               Control Panel
            </h2>
          </div>
          
          <div class="flex items-center gap-6">
            <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-full text-xs font-semibold text-slate-500">
               <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
               System Online
            </div>
            
            <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden ring-2 ring-blue-500/20 shadow-inner">
               <!-- Could be dynamic admin avatar -->
               <div class="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm font-bold">ADM</div>
            </div>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto bg-slate-100/30 dark:bg-[#0b0e14]/50 scroll-smooth">
          <div class="max-w-[1400px] mx-auto px-10 py-10">
              <router-outlet></router-outlet>
          </div>
        </div>
      </main>
    </div>

  `
})
export class AdminLayoutComponent { }
