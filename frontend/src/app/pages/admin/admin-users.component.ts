
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, GetUsersResponse } from '../../services/admin.service';
import { Observable, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { UnixDatePipe } from '../../pipes/unix-date.pipe';

@Component({
    selector: 'app-admin-users',
    standalone: true,
    imports: [CommonModule, FormsModule, UnixDatePipe],
    template: `
    <div class="space-y-8 animate-fade-in-up">
       <!-- Header & Actions -->
       <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight">User Database</h2>
            <p class="text-slate-500 dark:text-slate-400 mt-1">Manage accounts, permissions, and view user insights.</p>
          </div>
          
          <div class="flex items-center gap-3 bg-white dark:bg-[#151921] p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800/50">
             <button (click)="setStatusFilter('all')" 
                [class]="currentStatus === 'all' ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'" 
                class="px-5 py-2.5 rounded-xl text-sm transition-all duration-200">All Users</button>
             <button (click)="setStatusFilter('active')"
                [class]="currentStatus === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm ring-1 ring-emerald-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'"
                class="px-5 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center gap-2">
                <span *ngIf="currentStatus === 'active'" class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Active
             </button>
             <button (click)="setStatusFilter('banned')"
                [class]="currentStatus === 'banned' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold shadow-sm ring-1 ring-rose-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'"
                class="px-5 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center gap-2">
                <span *ngIf="currentStatus === 'banned'" class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Banned
             </button>
             <button (click)="setStatusFilter('admin')"
                [class]="currentStatus === 'admin' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm ring-1 ring-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'"
                class="px-5 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center gap-2">
                <span *ngIf="currentStatus === 'admin'" class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Admins
             </button>
          </div>
       </div>

       <!-- Search Bar -->
       <div class="relative group">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
             </svg>
          </div>
          <input type="text" [ngModel]="searchTerm" (ngModelChange)="onSearch($event)" 
             placeholder="Search by name, email, or user ID..." 
             class="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-[#151921] text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
       </div>

       <!-- Users Table -->
       <div class="bg-white dark:bg-[#151921] rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800/50 overflow-hidden" *ngIf="users && users.length > 0">
          <div class="overflow-x-auto">
             <table class="w-full text-left border-collapse">
                <thead>
                   <tr class="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50">
                      <th class="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">User Profile</th>
                      <th class="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
                      <th class="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Role</th>
                      <th (click)="sort('created_at')" class="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-500 transition-colors select-none">
                          <div class="flex items-center gap-1">
                              Joined
                              <span *ngIf="sortBy === 'created_at'" class="text-[10px]">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
                          </div>
                      </th>
                      <th (click)="sort('last_active')" class="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-500 transition-colors select-none">
                          <div class="flex items-center gap-1">
                              Last Active
                              <span *ngIf="sortBy === 'last_active'" class="text-[10px]">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
                          </div>
                      </th>
                      <th class="px-8 py-5 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Manage</th>
                   </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
                   <tr *ngFor="let user of users" (click)="viewUser(user)" 
                       class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group">
                      <td class="px-8 py-4">
                         <div class="flex items-center gap-4">
                            <div class="relative">
                                <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all">
                                    <img *ngIf="user.avatar" [src]="getAvatarUrl(user.avatar)" class="w-full h-full object-cover">
                                    <div *ngIf="!user.avatar" class="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                                        {{ user.name.substring(0,2) }}
                                    </div>
                                </div>
                                <span *ngIf="user.is_admin" class="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-[#151921]" title="Admin">★</span>
                                <span *ngIf="user.is_vip" class="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-[#151921]" title="VIP">💎</span>
                            </div>
                             <div>
                                <div class="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{{ user.name }}</div>
                                <div class="text-sm text-slate-500 dark:text-slate-400">
                                   {{ user.email }} <span class="mx-1 opacity-30">|</span> <span class="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">{{ user.unique_id }}</span>
                                </div>
                             </div>
                         </div>
                      </td>
                      <td class="px-6 py-4">
                         <div *ngIf="!isBanned(user)" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span> Active
                         </div>
                         <div *ngIf="isBanned(user)" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">
                            <span class="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2"></span> Banned
                         </div>
                      </td>
                      <td class="px-6 py-4">
                          <span *ngIf="user.is_admin" class="text-indigo-600 dark:text-indigo-400 font-bold text-xs bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-lg">Administrator</span>
                          <span *ngIf="!user.is_admin" class="text-slate-500 dark:text-slate-400 text-sm">User</span>
                      </td>
                      <td class="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                         {{ user.created_at | unixDate:'mediumDate' }}
                      </td>
                      <td class="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                         {{ user.last_active ? (user.last_active | unixDate:'short') : 'Never' }}
                      </td>
                      <td class="px-8 py-4 text-right" (click)="$event.stopPropagation()">
                          <button (click)="viewUser(user)" class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all">
                             <span class="sr-only">Edit</span>
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                             </svg>
                          </button>
                      </td>
                   </tr>
                </tbody>
             </table>
          </div>

           <!-- Pagination Replacement: Infinite Scroll Sentinel -->
           <div class="scroll-sentinel h-4 w-full"></div>
           
           <div *ngIf="isLoading" class="px-8 py-6 flex justify-center bg-slate-50/30 dark:bg-slate-800/10">
               <div class="flex items-center gap-3 text-slate-500 font-medium">
                   <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                   <span>Loading more users...</span>
               </div>
           </div>

           <div *ngIf="!isLoading && currentPage >= totalPages && totalUsers > 0" class="px-8 py-6 text-center text-slate-400 text-sm italic bg-slate-50/30 dark:bg-slate-800/10">
               Showing all {{ totalUsers }} users.
           </div>
       </div>

       <!-- Modern User Details Slide-over -->
       <div *ngIf="selectedUser" class="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
            <div class="absolute inset-0 overflow-hidden">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="closeUserDrawer()"></div>
                
                <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                    <div class="pointer-events-auto w-screen max-w-2xl transform transition-transform duration-500 ease-in-out">
                        <div class="flex h-full flex-col bg-white dark:bg-[#151921] shadow-2xl">
                            
                            <!-- Header with Tabs -->
                            <div class="px-8 pt-8 pb-0 bg-white dark:bg-[#151921] z-10">
                                <div class="flex items-start justify-between mb-8">
                                    <div class="flex items-center gap-5">
                                        <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden ring-4 ring-slate-50 dark:ring-slate-800/50">
                                            <img *ngIf="selectedUser.avatar" [src]="getAvatarUrl(selectedUser.avatar)" class="w-full h-full object-cover">
                                            <div *ngIf="!selectedUser.avatar" class="w-full h-full flex items-center justify-center text-xl font-bold text-slate-500">
                                                {{ selectedUser.name.substring(0,2) }}
                                            </div>
                                        </div>
                                        <div>
                                            <h2 class="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{{ selectedUser.name }}</h2>
                                            <p class="text-slate-500 dark:text-slate-400 font-medium">{{ selectedUser.email }}</p>
                                        </div>
                                    </div>
                                    <button type="button" class="rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" (click)="closeUserDrawer()">
                                        <span class="sr-only">Close panel</span>
                                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <!-- Tabs -->
                                <div class="flex gap-8 border-b border-slate-200 dark:border-slate-800">
                                    <button (click)="setActiveTab('overview')" 
                                        [class]="activeTab === 'overview' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                                        class="pb-4 font-bold text-sm border-b-2 transition-colors">Overview</button>
                                    <button (click)="setActiveTab('edit')" 
                                        [class]="activeTab === 'edit' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                                        class="pb-4 font-bold text-sm border-b-2 transition-colors">Edit Profile</button>
                                    <button (click)="setActiveTab('activity')" 
                                        [class]="activeTab === 'activity' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                                        class="pb-4 font-bold text-sm border-b-2 transition-colors">Activity Logs</button>
                                    <button (click)="setActiveTab('coins')" 
                                        [class]="activeTab === 'coins' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                                        class="pb-4 font-bold text-sm border-b-2 transition-colors">Coins & VIP</button>
                                </div>
                            </div>
                            
                            <!-- Content Area -->
                            <div class="flex-1 overflow-y-auto p-8 relative" *ngIf="userDetails; else loadingDetails">
                                
                                <!-- Overview Tab -->
                                <div *ngIf="activeTab === 'overview'" class="space-y-8 animate-fade-in-up">
                                    <!-- Key Stats Row -->
                                    <div class="grid grid-cols-3 gap-4">
                                        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Messages</div>
                                            <div class="text-2xl font-black text-slate-800 dark:text-white">{{ userDetails.stats?.messages_sent || 0 }}</div>
                                        </div>
                                        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Conversations</div>
                                            <div class="text-2xl font-black text-slate-800 dark:text-white">{{ userDetails.stats?.total_conversations || 0 }}</div>
                                        </div>
                                        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div>
                                            <div class="text-2xl font-black" [ngClass]="isBanned(selectedUser) ? 'text-rose-500' : 'text-emerald-500'">
                                                {{ isBanned(selectedUser) ? 'Banned' : 'Active' }}
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Bio & Info -->
                                    <div class="space-y-6">
                                        <div>
                                            <h4 class="text-sm font-bold text-slate-900 dark:text-white mb-2">About</h4>
                                            <p class="text-slate-600 dark:text-slate-400 leading-relaxed text-sm bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                                {{ userDetails.bio || 'No biography provided by user.' }}
                                            </p>
                                        </div>

                                        <div class="grid grid-cols-2 gap-6">
                                            <div>
                                                <h4 class="text-sm font-bold text-slate-900 dark:text-white mb-1">Location</h4>
                                                <div class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {{ userDetails.location || 'Unknown' }}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 class="text-sm font-bold text-slate-900 dark:text-white mb-1">Gender</h4>
                                                <div class="flex items-center gap-2 text-slate-600 dark:text-slate-400 capitalize">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    {{ userDetails.gender || 'Not specified' }}
                                                </div>
                                            </div>
                                        </div>

                                        <div *ngIf="userDetails.interests?.length">
                                            <h4 class="text-sm font-bold text-slate-900 dark:text-white mb-3">Interests</h4>
                                            <div class="flex flex-wrap gap-2">
                                                <span *ngFor="let interest of userDetails.interests" class="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                                                    #{{ interest.name }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                       <h4 class="text-sm font-bold text-slate-900 dark:text-white mb-2">Last Active</h4>
                                       <div class="flex items-center gap-2 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          <span class="font-medium">
                                              {{ userDetails.last_active | unixDate:'full' }}
                                              <span *ngIf="!userDetails.last_active" class="italic opacity-50">Never active</span>
                                          </span>
                                       </div>
                                    </div>

                                    <!-- Account Actions -->
                                    <div class="pt-8 border-t border-slate-200 dark:border-slate-800">
                                        <h4 class="text-sm font-bold text-slate-900 dark:text-white mb-4">Account Actions</h4>
                                        <div class="grid grid-cols-2 gap-4">
                                            <button (click)="toggleAdmin(selectedUser.id)" 
                                                class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                                {{ selectedUser.is_admin ? 'Revoke Admin' : 'Grant Admin' }}
                                            </button>
                                            
                                            <button *ngIf="!isBanned(selectedUser)" (click)="banUser(selectedUser.id)" 
                                                class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors border border-rose-100 dark:border-rose-500/20">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                </svg>
                                                Ban User
                                            </button>

                                            <button *ngIf="isBanned(selectedUser)" (click)="unbanUser(selectedUser.id)" 
                                                class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors border border-emerald-100 dark:border-emerald-500/20">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                Unban User
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Edit Tab -->
                                <div *ngIf="activeTab === 'edit'" class="space-y-6 animate-fade-in-up">
                                    <div class="space-y-4">
                                        <div>
                                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Display Name</label>
                                            <input [(ngModel)]="editForm.name" type="text" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                                        </div>
                                         <div>
                                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                                            <input [(ngModel)]="editForm.email" type="email" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Bio / Description</label>
                                            <textarea [(ngModel)]="editForm.bio" rows="4" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"></textarea>
                                        </div>
                                        <div class="grid grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Location</label>
                                                <input [(ngModel)]="editForm.location" type="text" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Gender</label>
                                                <select [(ngModel)]="editForm.gender" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="pt-6 border-t border-slate-200 dark:border-slate-800 flex gap-4">
                                        <button (click)="saveUser()" class="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                                            Save Changes
                                        </button>
                                        <button (click)="setActiveTab('overview')" class="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold py-3 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                                            Cancel
                                        </button>
                                    </div>
                                </div>

                                <!-- Activity Tab -->
                                <div *ngIf="activeTab === 'activity'" class="space-y-6 animate-fade-in-up">
                                    <div *ngIf="isLoadingActivity" class="flex flex-col items-center justify-center py-12 gap-4">
                                        <div class="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600"></div>
                                        <span class="text-slate-500 font-medium animate-pulse">Loading activity history...</span>
                                    </div>
                                    
                                    <div *ngIf="!isLoadingActivity && (!userActivity || userActivity.length === 0)" class="text-center py-12">
                                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 class="text-lg font-bold text-slate-800 dark:text-white">No Activity Yet</h3>
                                        <p class="text-slate-500 dark:text-slate-400">This user hasn't performed any logged actions.</p>
                                    </div>

                                    <div *ngIf="!isLoadingActivity && userActivity && userActivity.length > 0" class="relative">
                                        <!-- Timeline line -->
                                        <div class="absolute top-0 bottom-0 left-[23px] w-px bg-slate-200 dark:bg-slate-800"></div>
                                        
                                        <div class="space-y-8 relative z-10">
                                            <div *ngFor="let activity of userActivity; let last = last" class="flex gap-4">
                                                <!-- Icon col -->
                                                <div class="flex-shrink-0 flex flex-col items-center">
                                                    <div class="w-12 h-12 rounded-full border-4 border-white dark:border-[#151921] flex items-center justify-center"
                                                         [ngClass]="getActivityIconBgClass(activity.type)">
                                                        <!-- Uses dynamic icon based on type -->
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" [innerHTML]="getActivityIconPath(activity.type)"></svg>
                                                    </div>
                                                </div>
                                                <!-- Content col -->
                                                <div class="flex-1 pt-1 mb-2">
                                                    <div class="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                                                        <div class="flex justify-between items-start gap-4 mb-2">
                                                            <h4 class="font-bold text-slate-800 dark:text-white flex-1">{{ getActivityTitle(activity.type) }}</h4>
                                                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700">
                                                                {{ formatActivityDate(activity.timestamp) }}
                                                            </div>
                                                        </div>
                                                        <p *ngIf="activity.details" class="text-sm text-slate-600 dark:text-slate-400 break-words line-clamp-2">
                                                            "{{ activity.details }}"
                                                        </p>
                                                        <p *ngIf="!activity.details && getActivityDescription(activity.type)" class="text-sm text-slate-500 dark:text-slate-500 italic">
                                                            {{ getActivityDescription(activity.type) }}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Coins & VIP Tab -->
                                <div *ngIf="activeTab === 'coins'" class="space-y-8 animate-fade-in-up">
                                    <div class="grid grid-cols-2 gap-4">
                                        <div class="p-6 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                                            <div class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Current Coins</div>
                                            <div class="flex items-center gap-3">
                                                <div class="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white text-xl">🪙</div>
                                                <div class="text-3xl font-black text-slate-800 dark:text-white">{{ userDetails.coins || 0 }}</div>
                                            </div>
                                        </div>
                                        <div class="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
                                            <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">User Level</div>
                                            <div class="flex items-center gap-3">
                                                <div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xl">⭐</div>
                                                <div class="text-3xl font-black text-slate-800 dark:text-white">{{ calculateLevel(userDetails.xp) }}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Add/Remove Coins -->
                                    <div class="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800">
                                        <h4 class="text-lg font-black text-slate-800 dark:text-white mb-4">Manage Coins</h4>
                                        <div class="flex gap-4">
                                            <div class="relative flex-1">
                                                <input type="number" [(ngModel)]="coinAmount" placeholder="Amount (e.g. 100 or -50)" 
                                                    class="w-full pl-4 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151921] text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                                            </div>
                                            <button (click)="adjustCoins()" [disabled]="!coinAmount"
                                                class="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20">
                                                Update
                                            </button>
                                        </div>
                                        <p class="text-xs text-slate-500 mt-3">Enter a positive number to add coins, or negative to subtract.</p>
                                    </div>

                                    <!-- VIP Status -->
                                    <div class="bg-white dark:bg-[#151921] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div class="flex items-center justify-between mb-6">
                                            <div>
                                                <h4 class="text-lg font-black text-slate-800 dark:text-white">VIP Membership</h4>
                                                <p class="text-sm text-slate-500">Enable premium features for this user.</p>
                                            </div>
                                            <div [class]="userDetails.is_vip ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'" 
                                                 class="px-4 py-1.5 rounded-full text-white text-xs font-black uppercase tracking-widest">
                                                {{ userDetails.is_vip ? 'Active' : 'Inactive' }}
                                            </div>
                                        </div>

                                        <div *ngIf="userDetails.is_vip" class="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                                            <div class="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Expires On</div>
                                            <div class="text-lg font-bold text-slate-800 dark:text-white">
                                                {{ userDetails.vip_until | unixDate:'full' }}
                                            </div>
                                        </div>

                                        <button (click)="toggleVip()" 
                                            [class]="userDetails.is_vip ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200'"
                                            class="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest border transition-all">
                                            {{ userDetails.is_vip ? 'Deactivate VIP' : 'Activate VIP (30 Days)' }}
                                        </button>
                                    </div>
                                </div>

                            </div>
                            
                            <ng-template #loadingDetails>
                               <div class="flex items-center justify-center h-full">
                                   <div class="flex flex-col items-center gap-4">
                                       <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                                       <span class="text-slate-500 font-medium animate-pulse">Loading profile...</span>
                                   </div>
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
    users: any[] = [];
    totalUsers: number = 0;
    totalPages: number = 0;
    isLoading: boolean = false;

    searchTerm: string = '';
    currentStatus: string = 'all';
    currentPage: number = 1;
    sortBy: string = 'created_at';
    sortDir: string = 'desc';
    searchSubject = new Subject<string>();

    selectedUser: any = null;
    userDetails: any = null;
    userActivity: any[] | null = null;
    isLoadingActivity: boolean = false;
    isEditing: boolean = false;
    editForm: any = {};
    activeTab: string = 'overview';
    coinAmount: number | null = null;

    private observer: IntersectionObserver | null = null;

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
        this.setupInfiniteScroll();
    }

    ngOnDestroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    setupInfiniteScroll() {
        this.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.isLoading && this.currentPage < this.totalPages) {
                this.loadNextPage();
            }
        }, { threshold: 0.1 });

        // Wait for view to be ready
        setTimeout(() => {
            this.startObserving();
        }, 1000);
    }

    onSearch(term: string) {
        this.searchSubject.next(term);
    }

    setStatusFilter(status: string) {
        this.currentStatus = status;
        this.currentPage = 1;
        this.loadUsers();
    }

    sort(column: string) {
        if (this.sortBy === column) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = column;
            this.sortDir = 'asc';
        }
        this.loadUsers();
    }

    loadNextPage() {
        this.currentPage++;
        this.loadUsers(true);
    }

    loadUsers(append: boolean = false) {
        if (this.isLoading) return;
        this.isLoading = true;

        this.adminService.getUsers(this.currentPage, this.searchTerm, this.currentStatus, this.sortBy, this.sortDir).subscribe({
            next: (resp) => {
                if (append) {
                    this.users = [...this.users, ...resp.users];
                } else {
                    this.users = resp.users;
                }
                this.totalUsers = resp.total;
                this.totalPages = resp.pages;
                this.currentPage = resp.page;
                this.isLoading = false;

                // Re-observe if needed
                if (this.currentPage < this.totalPages) {
                    setTimeout(() => this.startObserving(), 100);
                }
            },
            error: (err) => {
                console.error('Failed to load users', err);
                this.isLoading = false;
            }
        });
    }

    private startObserving() {
        const sentinel = document.querySelector('.scroll-sentinel');
        if (sentinel && this.observer) {
            this.observer.observe(sentinel);
        }
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
        this.userDetails = null;
        this.userActivity = null;
        this.isEditing = false;
        this.activeTab = 'overview';
        this.adminService.getUserDetails(user.id).subscribe(details => {
            this.userDetails = details;
            this.editForm = { ...details };
        });
    }

    setActiveTab(tab: string) {
        this.activeTab = tab;
        if (tab === 'activity' && !this.userActivity) {
            this.isLoadingActivity = true;
            this.adminService.getUserActivity(this.selectedUser.id).subscribe({
                next: (log) => {
                    this.userActivity = log;
                    this.isLoadingActivity = false;
                },
                error: (err) => {
                    console.error('Failed to load activity log', err);
                    this.isLoadingActivity = false;
                }
            });
        }
    }

    startEdit() {
        this.isEditing = true;
        // editForm is already populated from viewUser
    }

    cancelEdit() {
        this.isEditing = false;
        this.editForm = {};
    }

    saveUser() {
        if (!this.editForm) return;

        this.adminService.updateUser(this.selectedUser.id, this.editForm).subscribe({
            next: () => {
                this.isEditing = false;
                this.userDetails = { ...this.userDetails, ...this.editForm };
                // Also update the list item if needed
                if (this.selectedUser) {
                    this.selectedUser.name = this.editForm.name;
                    this.selectedUser.email = this.editForm.email;
                }
                this.loadUsers(); // Refresh list to ensure consistency
            },
            error: (err) => {
                alert('Failed to update user');
                console.error(err);
            }
        });
    }

    closeUserDrawer() {
        this.selectedUser = null;
        this.userDetails = null;
        this.userActivity = null;
        this.isEditing = false;
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

    calculateLevel(xp: number): number {
        if (!xp) return 1;
        return Math.floor(Math.sqrt(xp / 100)) + 1;
    }

    adjustCoins() {
        if (!this.coinAmount || !this.selectedUser) return;
        
        this.adminService.addCoins(this.selectedUser.id, this.coinAmount).subscribe({
            next: () => {
                if (this.userDetails) {
                    this.userDetails.coins = (this.userDetails.coins || 0) + this.coinAmount!;
                }
                this.coinAmount = null;
                this.loadUsers();
            },
            error: (err) => alert('Failed to update coins')
        });
    }

    toggleVip() {
        if (!this.selectedUser) return;
        
        const action = this.userDetails.is_vip ? 'deactivate' : 'activate';
        if (confirm(`Are you sure you want to ${action} VIP for this user?`)) {
            this.adminService.toggleVip(this.selectedUser.id).subscribe({
                next: (res: any) => {
                    if (this.userDetails) {
                        this.userDetails.is_vip = res.is_vip;
                        this.userDetails.vip_until = res.vip_until;
                    }
                    if (this.selectedUser) {
                        this.selectedUser.is_vip = res.is_vip;
                        this.selectedUser.vip_until = res.vip_until;
                    }
                    this.loadUsers();
                },
                error: (err) => alert('Failed to update VIP status')
            });
        }
    }

    // Helper methods for the timeline UI
    getActivityTitle(type: string): string {
        switch (type) {
            case 'account_created': return 'Account Created';
            case 'message_sent': return 'Sent a Message';
            case 'post_created': return 'Created a Post';
            case 'photo_uploaded': return 'Uploaded a Photo';
            case 'friend_request_sent': return 'Sent a Friend Request';
            default: return 'Unknown Action';
        }
    }

    getActivityDescription(type: string): string {
        switch (type) {
            case 'account_created': return 'User joined the platform.';
            case 'friend_request_sent': return 'User sent a friend request.';
            default: return '';
        }
    }

    getActivityIconBgClass(type: string): string {
        switch (type) {
            case 'account_created': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';
            case 'message_sent': return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
            case 'post_created': return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400';
            case 'photo_uploaded': return 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400';
            case 'friend_request_sent': return 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400';
            default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
        }
    }

    getActivityIconPath(type: string): any {
        let path = '';
        switch (type) {
            case 'account_created':
                path = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />';
                break;
            case 'message_sent':
                path = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />';
                break;
            case 'post_created':
                path = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />';
                break;
            case 'photo_uploaded':
                path = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />';
                break;
            case 'friend_request_sent':
                path = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />';
                break;
            default:
                path = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />';
        }
        return path; // For Angular [innerHTML] binding
    }

    formatActivityDate(timestamp: number): string {
        if (!timestamp) return '';
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

}
