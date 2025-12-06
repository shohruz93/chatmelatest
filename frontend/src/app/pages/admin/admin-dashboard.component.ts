
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
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-3xl font-bold text-gray-800 dark:text-white">Dashboard Overview</h2>
        <span class="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-sm text-gray-500">
           Last updated: Just now
        </span>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" *ngIf="stats$ | async as stats; else loading">
        
        <!-- Total Users Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div class="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-blue-50 dark:from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex items-center justify-between mb-4">
                <div class="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
            </div>
            <h3 class="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Users</h3>
            <p class="text-3xl font-bold text-gray-800 dark:text-white mt-1">{{ stats.total_users }}</p>
            <p class="text-sm text-green-500 mt-2 flex items-center">
                <span class="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded text-xs font-semibold mr-2">+{{ stats.new_users }}</span>
                <span class="text-gray-400">last 7 days</span>
            </p>
        </div>

        <!-- Active Users Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden group">
             <div class="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-emerald-50 dark:from-emerald-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex items-center justify-between mb-4">
                <div class="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                   <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                   </svg>
                </div>
            </div>
            <h3 class="text-gray-500 dark:text-gray-400 text-sm font-medium">Active (24h)</h3>
            <p class="text-3xl font-bold text-gray-800 dark:text-white mt-1">{{ stats.active_users }}</p>
            <p class="text-sm text-gray-400 mt-2">users logged in recently</p>
        </div>

        <!-- Online Now Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden group">
             <div class="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-purple-50 dark:from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex items-center justify-between mb-4">
                <div class="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400 animate-pulse">
                   <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                   </svg>
                </div>
            </div>
            <h3 class="text-gray-500 dark:text-gray-400 text-sm font-medium">Online Now</h3>
            <p class="text-3xl font-bold text-gray-800 dark:text-white mt-1">{{ socketService.onlineUsers().size }}</p>
            <p class="text-sm text-gray-400 mt-2">currently browsing</p>
        </div>

        <!-- Total Messages Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden group">
             <div class="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-pink-50 dark:from-pink-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex items-center justify-between mb-4">
                <div class="p-3 bg-pink-50 dark:bg-pink-900/30 rounded-xl text-pink-600 dark:text-pink-400">
                   <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                   </svg>
                </div>
            </div>
            <h3 class="text-gray-500 dark:text-gray-400 text-sm font-medium">Messages Sent</h3>
            <p class="text-3xl font-bold text-gray-800 dark:text-white mt-1">{{ stats.total_messages }}</p>
            <p class="text-sm text-gray-400 mt-2">all time interactions</p>
        </div>
      </div>

      <ng-template #loading>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
             <div class="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" *ngFor="let i of [1,2,3,4]"></div>
        </div>
      </ng-template>

      <!-- Additional Section (Charts placeholder or Activity) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
         <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
             <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Gender Distribution</h3>
              <!-- Simple Bar Chart Visualization (CSS based for simplicity in snippet) -->
             <div class="space-y-4" *ngIf="stats$ | async as stats">
                <div *ngFor="let item of stats.gender_distribution">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="capitalize text-gray-600 dark:text-gray-400">{{item.gender}}</span>
                        <span class="font-bold text-gray-800 dark:text-white">{{item.count}}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                         <div class="bg-blue-600 h-2.5 rounded-full" [style.width.%]="(item.count / stats.total_users) * 100"></div>
                    </div>
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
