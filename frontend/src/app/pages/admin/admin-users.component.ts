
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
       <div class="bg-white dark:bg-[#151921] rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800/50 overflow-hidden" *ngIf="usersResponse$ | async as response">
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
                   <tr *ngFor="let user of response.users" (click)="viewUser(user)" 
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
                            </div>
                            <div>
                               <div class="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{{ user.name }}</div>
                               <div class="text-sm text-slate-500 dark:text-slate-400">{{ user.email }}</div>
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

          <!-- Pagination -->
          <div class="px-8 py-6 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/10">
              <span class="text-sm font-medium text-slate-500 dark:text-slate-400">Page {{ response.page }} of {{ response.pages }} • {{ response.total }} total users</span>
              <div class="flex gap-2">
                 <button [disabled]="response.page <= 1" (click)="loadPage(response.page - 1)" 
                    class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                    Previous
                 </button>
                 <button [disabled]="response.page >= response.pages" (click)="loadPage(response.page + 1)" 
                    class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                    Next
                 </button>
              </div>
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
                                    <button (click)="activeTab = 'overview'" 
                                        [class]="activeTab === 'overview' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                                        class="pb-4 font-bold text-sm border-b-2 transition-colors">Overview</button>
                                    <button (click)="activeTab = 'edit'" 
                                        [class]="activeTab === 'edit' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                                        class="pb-4 font-bold text-sm border-b-2 transition-colors">Edit Profile</button>
                                    <button (click)="activeTab = 'activity'" 
                                        [class]="activeTab === 'activity' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                                        class="pb-4 font-bold text-sm border-b-2 transition-colors">Activity Logs</button>
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
                                        <button (click)="activeTab = 'overview'" class="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold py-3 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                                            Cancel
                                        </button>
                                    </div>
                                </div>

                                <!-- Activity Tab (Placeholder) -->
                                <div *ngIf="activeTab === 'activity'" class="space-y-6 animate-fade-in-up">
                                    <div class="text-center py-12">
                                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 class="text-lg font-bold text-slate-800 dark:text-white">Activity Log</h3>
                                        <p class="text-slate-500 dark:text-slate-400">Detailed user activity history is coming soon.</p>
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
    usersResponse$!: Observable<GetUsersResponse>;
    searchTerm: string = '';
    currentStatus: string = 'all';
    currentPage: number = 1;
    sortBy: string = 'created_at';
    sortDir: string = 'desc';
    searchSubject = new Subject<string>();

    selectedUser: any = null;
    userDetails: any = null;
    isEditing: boolean = false;
    editForm: any = {};
    activeTab: string = 'overview';

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

    sort(column: string) {
        if (this.sortBy === column) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = column;
            this.sortDir = 'asc';
        }
        this.loadUsers();
    }

    loadPage(page: number) {
        this.currentPage = page;
        this.loadUsers();
    }

    loadUsers() {
        this.usersResponse$ = this.adminService.getUsers(this.currentPage, this.searchTerm, this.currentStatus, this.sortBy, this.sortDir);
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
        this.isEditing = false;
        this.activeTab = 'overview';
        this.adminService.getUserDetails(user.id).subscribe(details => {
            this.userDetails = details;
            this.editForm = { ...details };
        });
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


}
