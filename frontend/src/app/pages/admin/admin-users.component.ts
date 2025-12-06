
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, GetUsersResponse } from '../../services/admin.service';
import { Observable, BehaviorSubject, switchMap, debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
    selector: 'app-admin-users',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="space-y-6">
       <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 class="text-3xl font-bold text-gray-800 dark:text-white">User Management</h2>
          
          <div class="flex items-center gap-3 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
             <button (click)="setStatusFilter('all')" [class.bg-gray-100]="currentStatus === 'all'" [class.dark:bg-gray-700]="currentStatus === 'all'" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">All</button>
             <button (click)="setStatusFilter('active')" [class.bg-emerald-50]="currentStatus === 'active'" [class.text-emerald-600]="currentStatus === 'active'" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-emerald-50/50">Active</button>
             <button (click)="setStatusFilter('banned')" [class.bg-red-50]="currentStatus === 'banned'" [class.text-red-600]="currentStatus === 'banned'" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-red-50/50">Banned</button>
             <button (click)="setStatusFilter('admin')" [class.bg-purple-50]="currentStatus === 'admin'" [class.text-purple-600]="currentStatus === 'admin'" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-purple-50/50">Admins</button>
          </div>
       </div>

       <!-- Filters & Search -->
       <div class="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4">
          <div class="relative flex-1">
             <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
             </span>
             <input type="text" [ngModel]="searchTerm" (ngModelChange)="onSearch($event)" placeholder="Search users by name or email..." 
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
          </div>
       </div>

       <!-- Users Table -->
       <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden" *ngIf="usersResponse$ | async as response">
          <div class="overflow-x-auto">
             <table class="w-full text-left">
                <thead>
                   <tr class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm">
                      <th class="px-6 py-4 font-semibold">User</th>
                      <th class="px-6 py-4 font-semibold">Status</th>
                      <th class="px-6 py-4 font-semibold">Role</th>
                      <th class="px-6 py-4 font-semibold">Joined</th>
                      <th class="px-6 py-4 font-semibold text-right">Actions</th>
                   </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                   <tr *ngFor="let user of response.users" class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                      <td class="px-6 py-4">
                         <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold uppercase text-sm">
                                {{ user.name.substring(0,2) }}
                            </div>
                            <div>
                               <div class="font-bold text-gray-800 dark:text-white">{{ user.name }}</div>
                               <div class="text-sm text-gray-500">{{ user.email }}</div>
                            </div>
                         </div>
                      </td>
                      <td class="px-6 py-4">
                         <span *ngIf="!isBanned(user)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Active
                         </span>
                         <span *ngIf="isBanned(user)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Banned
                         </span>
                      </td>
                      <td class="px-6 py-4">
                          <span *ngIf="user.is_admin" class="text-purple-600 font-medium text-sm flex items-center gap-1">
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                               <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                             </svg>
                             Admin
                          </span>
                          <span *ngIf="!user.is_admin" class="text-gray-500 text-sm">Member</span>
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-500">
                         {{ user.created_at | date:'mediumDate' }}
                      </td>
                      <td class="px-6 py-4 text-right">
                         <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button *ngIf="!isBanned(user)" (click)="banUser(user.id)" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Ban User">
                               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                               </svg>
                            </button>
                             <button *ngIf="isBanned(user)" (click)="unbanUser(user.id)" class="p-2 text-red-500 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all" title="Unban User">
                               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                               </svg>
                            </button>
                            <button (click)="toggleAdmin(user.id)" class="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-all" [title]="user.is_admin ? 'Remove Admin' : 'Make Admin'">
                               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                               </svg>
                            </button>
                         </div>
                      </td>
                   </tr>
                </tbody>
             </table>
          </div>

          <!-- Pagination -->
          <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <span class="text-sm text-gray-500">Page {{ response.page }} of {{ response.pages }} ({{ response.total }} users)</span>
              <div class="flex gap-2">
                 <button [disabled]="response.page <= 1" (click)="loadPage(response.page - 1)" class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 transition-colors">Prev</button>
                 <button [disabled]="response.page >= response.pages" (click)="loadPage(response.page + 1)" class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 transition-colors">Next</button>
              </div>
          </div>
       </div>
    </div>
  `
})
export class AdminUsersComponent implements OnInit {
    usersResponse$!: Observable<GetUsersResponse>;
    searchTerm: string = '';
    currentStatus: string = 'all';
    currentPage: number = 1;
    searchSubject = new Subject<string>();

    constructor(private adminService: AdminService) {
        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged()
        ).subscribe(term => {
            this.searchTerm = term;
            this.currentPage = 1;
            this.loadUsers();
        });
    }

    ngOnInit() {
        this.loadUsers();
    }

    onSearch(term: string) {
        this.searchSubject.next(term);
    }

    setStatusFilter(status: string) {
        this.currentStatus = status;
        this.currentPage = 1;
        this.loadUsers();
    }

    loadPage(page: number) {
        this.currentPage = page;
        this.loadUsers();
    }

    loadUsers() {
        this.usersResponse$ = this.adminService.getUsers(this.currentPage, this.searchTerm, this.currentStatus);
    }

    isBanned(user: any): boolean {
        // Logic depends on what backend returns. Assuming 'status' field or check.
        // Backend returns 'status' field now.
        return user.status === 'banned';
    }

    banUser(userId: number) {
        if (confirm('Are you sure you want to ban this user?')) {
            this.adminService.banUser(userId).subscribe(() => this.loadUsers());
        }
    }

    unbanUser(userId: number) {
        if (confirm('Are you sure you want to unban this user?')) {
            this.adminService.unbanUser(userId).subscribe(() => this.loadUsers());
        }
    }

    toggleAdmin(userId: number) {
        if (confirm('Change admin status for this user?')) {
            this.adminService.toggleAdmin(userId).subscribe(() => this.loadUsers());
        }
    }
}
