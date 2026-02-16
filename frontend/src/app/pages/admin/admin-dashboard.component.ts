
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { SocketService } from '../../services/socket.service';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="space-y-10 animate-fade-in-up">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight">System Overview</h2>
          <p class="text-slate-500 dark:text-slate-400 mt-1">Real-time metrics and platform health monitoring.</p>
        </div>
        <div class="flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#151921] rounded-2xl border border-slate-200 dark:border-slate-800/50 shadow-sm">
           <span class="relative flex h-3 w-3">
             <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
             <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
           </span>
           <span class="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Live Updates</span>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8" *ngIf="stats$ | async as stats; else loading">
        
        <!-- Total Users Card -->
        <div class="group relative bg-white dark:bg-[#151921] rounded-[2rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 overflow-hidden">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
            <div class="relative z-10">
                <div class="flex items-center justify-between mb-6">
                    <div class="p-3.5 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                </div>
                <h3 class="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Total Users</h3>
                <div class="flex items-baseline gap-2 mt-2">
                    <p class="text-4xl font-black text-slate-800 dark:text-white">{{ stats.total_users | number }}</p>
                </div>
                <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                    <span class="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">+{{ stats.new_users }}</span>
                    <span class="text-[10px] font-bold text-slate-400 uppercase">Weekly Growth</span>
                </div>
            </div>
        </div>

        <!-- Active Users Card -->
        <div class="group relative bg-white dark:bg-[#151921] rounded-[2rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 overflow-hidden">
             <div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
             <div class="relative z-10">
                <div class="flex items-center justify-between mb-6">
                    <div class="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                       </svg>
                    </div>
                </div>
                <h3 class="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Engagement (24h)</h3>
                <p class="text-4xl font-black text-slate-800 dark:text-white mt-1">{{ stats.active_users | number }}</p>
                <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                    <div class="w-full bg-slate-100 dark:bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-emerald-500 h-full rounded-full" [style.width.%]="(stats.active_users / stats.total_users) * 100"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Online Now Card -->
        <div class="group relative bg-white dark:bg-[#151921] rounded-[2rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 overflow-hidden">
             <div class="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
             <div class="relative z-10">
                <div class="flex items-center justify-between mb-6">
                    <div class="p-3.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                       </svg>
                    </div>
                </div>
                <h3 class="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">WebSocket Presence</h3>
                <p class="text-4xl font-black text-slate-800 dark:text-white mt-1 group-hover:scale-105 transition-transform origin-left">{{ socketService.onlineUsers().size }}</p>
                <p class="text-xs font-bold text-slate-400 mt-4 uppercase tracking-tighter">Connected Clients</p>
            </div>
        </div>

        <!-- Total Messages Card -->
        <div class="group relative bg-white dark:bg-[#151921] rounded-[2rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800/50 hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-300 overflow-hidden">
             <div class="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors"></div>
             <div class="relative z-10">
                <div class="flex items-center justify-between mb-6">
                    <div class="p-3.5 bg-rose-50 dark:bg-rose-500/10 rounded-2xl text-rose-600 dark:text-rose-400">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                       </svg>
                    </div>
                </div>
                <h3 class="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Platform Activity</h3>
                <p class="text-4xl font-black text-slate-800 dark:text-white mt-1">{{ stats.total_messages | number }}</p>
                <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center gap-2">
                    <span class="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Total Messages</span>
                </div>
            </div>
        </div>
      </div>

      <ng-template #loading>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
             <div class="h-56 bg-white dark:bg-[#151921] rounded-3xl animate-pulse border border-slate-200 dark:border-slate-800/50" *ngFor="let i of [1,2,3,4]"></div>
        </div>
      </ng-template>

      <!-- Distribution & Insights -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <!-- Gender Distribution -->
         <div class="lg:col-span-1 bg-white dark:bg-[#151921] rounded-[2rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800/50">
             <div class="flex items-center justify-between mb-8">
                <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight">Demographics</h3>
                <div class="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
             </div>
             
             <div class="space-y-6" *ngIf="stats$ | async as stats">
                <div *ngFor="let item of stats.gender_distribution" class="group">
                    <div class="flex justify-between items-end mb-2">
                        <span class="capitalize text-sm font-bold text-slate-600 dark:text-slate-300">{{item.gender}}</span>
                        <div class="flex items-baseline gap-1">
                            <span class="text-lg font-black text-slate-800 dark:text-white">{{item.count}}</span>
                            <span class="text-[10px] font-bold text-slate-400 uppercase">{{ ((item.count / stats.total_users) * 100) | number:'1.0-1' }}%</span>
                        </div>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-800/50 rounded-full h-3 overflow-hidden p-0.5">
                         <div class="h-full rounded-full transition-all duration-1000 ease-out" 
                              [ngClass]="{
                                'bg-gradient-to-r from-blue-500 to-blue-400': item.gender === 'male',
                                'bg-gradient-to-r from-rose-500 to-rose-400': item.gender === 'female',
                                'bg-gradient-to-r from-teal-500 to-teal-400': item.gender !== 'male' && item.gender !== 'female'
                              }"
                              [style.width.%]="(item.count / stats.total_users) * 100"></div>
                    </div>
                </div>
             </div>
         </div>

         <!-- Quick Insights Placeholder -->
         <div class="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[2rem] p-10 shadow-xl shadow-blue-500/10 text-white relative overflow-hidden group">
             <div class="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
             <div class="relative z-10 h-full flex flex-col">
                <div class="flex items-center gap-3 mb-6">
                    <span class="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">Platform Status</span>
                    <span class="w-1 h-1 bg-white/40 rounded-full"></span>
                    <span class="text-xs font-bold text-white/70">Daily Summary</span>
                </div>
                <h3 class="text-4xl font-black mb-6 leading-tight">Admin Intelligence Dashboard</h3>
                <p class="text-indigo-100/80 max-w-md text-lg leading-relaxed mb-auto">
                    Global activity is currently peaking. Recommend monitoring server resources as online users approach the weekend threshold.
                </p>
                <div class="flex items-center gap-6 mt-10">
                    <div class="flex -space-x-3">
                        <div *ngFor="let i of [1,2,3,4]" class="w-10 h-10 rounded-full border-2 border-indigo-700 bg-indigo-500/30 flex items-center justify-center text-[10px] font-bold backdrop-blur-sm">
                            OP
                        </div>
                    </div>
                    <span class="text-xs font-bold text-white/60">4 Active Moderators Online</span>
                </div>
             </div>
         </div>
      </div>
    </div>

  `
})
export class AdminDashboardComponent implements OnInit {
    stats$!: Observable<any>;

    constructor(
        private adminService: AdminService,
        public socketService: SocketService
    ) { }

    ngOnInit() {
        this.stats$ = this.adminService.getStats();
    }
}
