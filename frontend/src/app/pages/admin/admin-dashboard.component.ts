
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
    <div class="space-y-10 animate-fade-in-up pb-10">
      
      <!-- Dashboard Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 text-xs font-bold tracking-wider uppercase mb-4">
            <i class="fi fi-rr-pulse"></i>
            Live Telemetry
          </div>
          <h2 class="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tight">System Overview</h2>
          <p class="text-slate-500 dark:text-slate-400 mt-2 text-lg">Real-time metrics, platform health, and AI insights.</p>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6" *ngIf="stats$ | async as stats; else loading">
        
        <!-- Total Users Card -->
        <div class="group relative bg-white/60 dark:bg-[#111827]/60 backdrop-blur-xl rounded-[2rem] p-8 shadow-sm border border-slate-200/50 dark:border-slate-800/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div class="absolute -right-10 -top-10 w-40 h-40 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl group-hover:bg-primary-500/20 transition-colors duration-700"></div>
            <div class="relative z-10">
                <div class="flex items-center justify-between mb-8">
                    <div class="w-14 h-14 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-500/10 dark:to-primary-500/20 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400 ring-1 ring-primary-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <i class="fi fi-rr-users-alt text-2xl"></i>
                    </div>
                    <div class="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1 shadow-sm">
                      <i class="fi fi-rr-arrow-trend-up"></i>
                      +{{ stats.new_users }}
                    </div>
                </div>
                <h3 class="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Total Users</h3>
                <p class="text-5xl font-black text-slate-800 dark:text-white tracking-tight">{{ stats.total_users | number }}</p>
            </div>
        </div>

        <!-- Active Users Card -->
        <div class="group relative bg-white/60 dark:bg-[#111827]/60 backdrop-blur-xl rounded-[2rem] p-8 shadow-sm border border-slate-200/50 dark:border-slate-800/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
             <div class="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-700"></div>
             <div class="relative z-10">
                <div class="flex items-center justify-between mb-8">
                    <div class="w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                       <i class="fi fi-rr-time-fast text-2xl"></i>
                    </div>
                </div>
                <h3 class="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Engagement (24h)</h3>
                <p class="text-5xl font-black text-slate-800 dark:text-white tracking-tight">{{ stats.active_users | number }}</p>
                <div class="mt-6">
                    <div class="flex justify-between text-xs font-bold text-slate-400 mb-2">
                      <span>Conversion Rate</span>
                      <span class="text-emerald-500">{{ ((stats.active_users / stats.total_users) * 100) | number:'1.0-1' }}%</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full w-0 group-hover:w-full transition-all duration-1000 ease-out" [style.width.%]="(stats.active_users / stats.total_users) * 100"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Online Now Card -->
        <div class="group relative bg-white/60 dark:bg-[#111827]/60 backdrop-blur-xl rounded-[2rem] p-8 shadow-sm border border-slate-200/50 dark:border-slate-800/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
             <div class="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors duration-700"></div>
             <div class="relative z-10">
                <div class="flex items-center justify-between mb-8">
                    <div class="w-14 h-14 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-500/10 dark:to-purple-500/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                       <i class="fi fi-rr-network text-2xl"></i>
                    </div>
                    <span class="relative flex h-3 w-3">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                    </span>
                </div>
                <h3 class="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Active Sockets</h3>
                <p class="text-5xl font-black text-slate-800 dark:text-white tracking-tight">{{ socketService.onlineUsers().size }}</p>
                <p class="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Real-time Clients</p>
            </div>
        </div>

        <!-- Total Messages Card -->
        <div class="group relative bg-white/60 dark:bg-[#111827]/60 backdrop-blur-xl rounded-[2rem] p-8 shadow-sm border border-slate-200/50 dark:border-slate-800/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
             <div class="absolute -right-10 -top-10 w-40 h-40 bg-rose-500/10 dark:bg-rose-500/20 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-colors duration-700"></div>
             <div class="relative z-10">
                <div class="flex items-center justify-between mb-8">
                    <div class="w-14 h-14 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-500/10 dark:to-rose-500/20 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                       <i class="fi fi-rr-comment-alt text-2xl"></i>
                    </div>
                </div>
                <h3 class="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Messages Sent</h3>
                <p class="text-5xl font-black text-slate-800 dark:text-white tracking-tight">{{ stats.total_messages | number }}</p>
                <div class="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                    <span class="text-xs font-bold text-rose-500 dark:text-rose-400 tracking-widest uppercase">Platform Activity</span>
                </div>
            </div>
        </div>
      </div>

      <ng-template #loading>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
             <div class="h-[280px] bg-white/40 dark:bg-[#111827]/40 rounded-[2rem] animate-pulse border border-slate-200/50 dark:border-slate-800/50" *ngFor="let i of [1,2,3,4]"></div>
        </div>
      </ng-template>

      <!-- Second Row: Charts & Insights -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6" *ngIf="stats$ | async as stats">
         
         <!-- Demographics Glass Card -->
         <div class="lg:col-span-1 bg-white/60 dark:bg-[#111827]/60 backdrop-blur-xl rounded-[2rem] p-8 shadow-sm border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden">
             <!-- Background glow -->
             <div class="absolute bottom-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>
             
             <div class="flex items-center justify-between mb-10 relative z-10">
                <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight">Demographics</h3>
                <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700/50">
                    <i class="fi fi-rr-chart-pie-alt text-slate-500 dark:text-slate-400"></i>
                </div>
             </div>
             
             <div class="space-y-8 relative z-10">
                <div *ngFor="let item of stats.gender_distribution" class="group">
                    <div class="flex justify-between items-end mb-3">
                        <div class="flex items-center gap-2">
                           <div class="w-2 h-2 rounded-full"
                                [ngClass]="{
                                  'bg-blue-500': item.gender === 'male',
                                  'bg-rose-500': item.gender === 'female',
                                  'bg-teal-500': item.gender !== 'male' && item.gender !== 'female'
                                }"></div>
                           <span class="capitalize text-sm font-bold text-slate-600 dark:text-slate-300">{{item.gender}}</span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span class="text-xl font-black text-slate-800 dark:text-white">{{item.count}}</span>
                            <span class="text-xs font-bold text-slate-400 uppercase">{{ ((item.count / stats.total_users) * 100) | number:'1.0-1' }}%</span>
                        </div>
                    </div>
                    <div class="w-full bg-slate-200/50 dark:bg-slate-800/80 rounded-full h-2 overflow-hidden shadow-inner">
                         <div class="h-full rounded-full transition-all duration-1000 ease-out" 
                              [ngClass]="{
                                'bg-gradient-to-r from-blue-400 to-blue-600': item.gender === 'male',
                                'bg-gradient-to-r from-rose-400 to-rose-600': item.gender === 'female',
                                'bg-gradient-to-r from-teal-400 to-teal-600': item.gender !== 'male' && item.gender !== 'female'
                              }"
                              [style.width.%]="(item.count / stats.total_users) * 100"></div>
                    </div>
                </div>
             </div>
         </div>

         <!-- AI Consultant Banner -->
         <div class="lg:col-span-2 relative bg-slate-900 rounded-[2rem] p-10 shadow-2xl overflow-hidden group border border-slate-800 flex flex-col justify-between">
             <!-- Gorgeous Gradient Background -->
             <div class="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 opacity-90"></div>
             <div class="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-gradient-to-b from-primary-500/20 to-purple-500/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000 rotate-12"></div>
             
             <!-- Floating Elements -->
             <div class="absolute top-10 right-10 w-24 h-24 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md rotate-12 animate-pulse"></div>
             <div class="absolute bottom-10 right-32 w-16 h-16 bg-white/5 rounded-full border border-white/10 backdrop-blur-md -rotate-12 animate-bounce" style="animation-duration: 4s;"></div>

             <div class="relative z-10">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-6">
                    <span class="w-2 h-2 rounded-full bg-primary-400 animate-ping"></span>
                    <span class="text-[10px] font-black tracking-widest text-white uppercase">AI Consultant Active</span>
                </div>
                <h3 class="text-4xl md:text-5xl font-black mb-4 text-white leading-tight">
                   Supercharge your <br/><span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-400">administration.</span>
                </h3>
                <p class="text-slate-300 max-w-md text-lg leading-relaxed mb-8">
                    Ask natural language questions about your database. Discover insights instantly without writing a single line of SQL.
                </p>
             </div>

             <div class="relative z-10 flex items-center justify-between mt-auto pt-8 border-t border-white/10">
                 <div class="flex -space-x-3">
                     <div class="w-12 h-12 rounded-full border-2 border-slate-900 bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                        <i class="fi fi-rr-robot"></i>
                     </div>
                     <div class="w-12 h-12 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold">
                        SQL
                     </div>
                 </div>
                 
                 <a routerLink="/admin/ai-chat" class="px-6 py-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-colors shadow-lg shadow-white/10 flex items-center gap-2 group/btn">
                    Launch AI Chat
                    <i class="fi fi-rr-arrow-right transition-transform group-hover/btn:translate-x-1"></i>
                 </a>
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
