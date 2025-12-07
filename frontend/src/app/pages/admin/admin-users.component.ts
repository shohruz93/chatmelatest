
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, GetUsersResponse } from '../../services/admin.service';
import { Observable, Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
   selector: 'app-admin-users',
   standalone: true,
   imports: [CommonModule, FormsModule],
   template: `
    <div class="space-y-6 relative">
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
                   <tr *ngFor="let user of response.users" (click)="viewUser(user)" class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group cursor-pointer">
                      <td class="px-6 py-4">
                         <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                                <img *ngIf="user.avatar" [src]="getAvatarUrl(user.avatar)" class="w-full h-full object-cover">
                                <div *ngIf="!user.avatar" class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 font-bold uppercase text-sm">
                                    {{ user.name.substring(0,2) }}
                                </div>
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
                      <td class="px-6 py-4 text-right" (click)="$event.stopPropagation()">
                         <div class="flex items-center justify-end gap-2 text-gray-500">
                             <button (click)="viewUser(user)" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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

       <!-- User Details Drawer -->
       <div *ngIf="selectedUser" class="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
            <div class="absolute inset-0 overflow-hidden">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="closeUserDrawer()"></div>
                
                <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                    <div class="pointer-events-auto w-screen max-w-md">
                        <div class="flex h-full flex-col overflow-y-scroll bg-white dark:bg-gray-800 shadow-xl">
                            <!-- Header -->
                            <div class="bg-gray-50 dark:bg-gray-900 px-4 py-6 sm:px-6 border-b dark:border-gray-700">
                                <div class="flex items-center justify-between">
                                    <h2 class="text-lg font-medium text-gray-900 dark:text-white" id="slide-over-title">User Profile</h2>
                                    <div class="ml-3 flex h-7 items-center">
                                        <button type="button" class="rounded-md bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none" (click)="closeUserDrawer()">
                                            <span class="sr-only">Close panel</span>
                                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="relative flex-1 px-4 py-6 sm:px-6 space-y-6" *ngIf="userDetails; else loadingDetails">
                                <!-- Profile Info -->
                                <div class="flex flex-col items-center">
                                    <div class="w-24 h-24 rounded-full overflow-hidden shadow-md mb-4">
                                        <img *ngIf="userDetails.avatar" [src]="getAvatarUrl(userDetails.avatar)" class="w-full h-full object-cover">
                                        <div *ngIf="!userDetails.avatar" class="w-full h-full flex items-center justify-center bg-gray-200 text-3xl font-bold text-gray-600">
                                            {{ userDetails.name.substring(0,2).toUpperCase() }}
                                        </div>
                                    </div>
                                    <h3 class="text-2xl font-bold text-gray-900 dark:text-white text-center">{{ userDetails.name }}</h3>
                                    <p class="text-gray-500 text-sm">{{ userDetails.email }}</p>
                                    
                                    <div class="flex mt-4 gap-2">
                                        <span class="px-3 py-1 rounded-full text-xs font-semibold" [ngClass]="isBanned(selectedUser) ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'">
                                            {{ isBanned(selectedUser) ? 'Banned' : 'Active' }}
                                        </span>
                                        <span *ngIf="userDetails.is_admin" class="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                                            Admin
                                        </span>
                                    </div>
                                </div>

                                <!-- Actions -->
                                <div class="grid grid-cols-2 gap-4">
                                    <button *ngIf="!isBanned(selectedUser)" (click)="banUser(selectedUser.id)" class="flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 w-full">
                                        Ban Check
                                    </button>
                                     <button *ngIf="isBanned(selectedUser)" (click)="unbanUser(selectedUser.id)" class="flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 w-full">
                                        Unban User
                                    </button>
                                    <button (click)="toggleAdmin(selectedUser.id)" class="flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 w-full">
                                        {{ selectedUser.is_admin ? 'Demote Admin' : 'Make Admin' }}
                                    </button>
                                </div>

                                <!-- Stats -->
                                <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                    <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Activity Stats</h4>
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ userDetails.stats?.messages_sent || 0 }}</div>
                                            <div class="text-xs text-gray-500">Messages Sent</div>
                                        </div>
                                        <div>
                                            <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ userDetails.stats?.total_conversations || 0 }}</div>
                                            <div class="text-xs text-gray-500">Conversations</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Details List -->
                                <div class="space-y-4">
                                    <div>
                                        <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Bio</h4>
                                        <p class="mt-1 text-sm text-gray-900 dark:text-gray-200">{{ userDetails.bio || 'No bio provided' }}</p>
                                    </div>
                                    
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Gender</h4>
                                            <p class="mt-1 text-sm text-gray-900 dark:text-gray-200 capitalize">{{ userDetails.gender || 'Not specified' }}</p>
                                        </div>
                                        <div>
                                            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Location</h4>
                                            <p class="mt-1 text-sm text-gray-900 dark:text-gray-200">{{ userDetails.location || 'Not specified' }}</p>
                                        </div>
                                         <div>
                                            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Native Lang</h4>
                                            <p class="mt-1 text-sm text-gray-900 dark:text-gray-200">{{ userDetails.native_language || '-' }}</p>
                                        </div>
                                        <div>
                                            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Learning Lang</h4>
                                            <p class="mt-1 text-sm text-gray-900 dark:text-gray-200">{{ userDetails.learning_language || '-' }}</p>
                                        </div>
                                    </div>

                                    <div *ngIf="userDetails.interests?.length">
                                        <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Interests</h4>
                                        <div class="flex flex-wrap gap-2">
                                            <span *ngFor="let interest of userDetails.interests" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                {{ interest.name }}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                             <ng-template #loadingDetails>
                                <div class="flex items-center justify-center h-64">
                                    <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                                </div>
                            </ng-template>
                        </div>
                    </div>
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

   selectedUser: any = null;
   userDetails: any = null;

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
      return user && user.status === 'banned';
   }

   getAvatarUrl(path: string | undefined): string {
      if (!path) return '';
      if (path.startsWith('http')) return path;
      return `${this.adminService.apiUrl}/${path}`;
   }

   viewUser(user: any) {
      this.selectedUser = user;
      this.userDetails = null; // Clear previous details
      this.adminService.getUserDetails(user.id).subscribe(details => {
         this.userDetails = details;
      });
   }

   closeUserDrawer() {
      this.selectedUser = null;
      this.userDetails = null;
   }

   banUser(userId: number) {
      if (confirm('Are you sure you want to ban this user?')) {
         this.adminService.banUser(userId).subscribe(() => {
            this.loadUsers();
            if (this.selectedUser && this.selectedUser.id === userId) {
               this.selectedUser.status = 'banned';
               if (this.userDetails) this.userDetails.status = 'banned';
            }
         });
      }
   }

   unbanUser(userId: number) {
      if (confirm('Are you sure you want to unban this user?')) {
         this.adminService.unbanUser(userId).subscribe(() => {
            this.loadUsers();
            if (this.selectedUser && this.selectedUser.id === userId) {
               this.selectedUser.status = 'active';
               if (this.userDetails) this.userDetails.status = 'active';
            }
         });
      }
   }

   toggleAdmin(userId: number) {
      if (confirm('Change admin status for this user?')) {
         this.adminService.toggleAdmin(userId).subscribe((res: any) => {
            this.loadUsers();
            if (this.selectedUser && this.selectedUser.id === userId) {
               this.selectedUser.is_admin = !this.selectedUser.is_admin;
               if (this.userDetails) this.userDetails.is_admin = !this.userDetails.is_admin;
            }
         });
      }
   }
}
