import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">Manage and monitor all platform users</p>
        </div>
        <button class="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:scale-105 transition-all">
          <i class="fas fa-user-plus mr-2"></i> Add New User
        </button>
      </div>

      <!-- Search and Filters -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Search -->
          <div class="md:col-span-2">
            <div class="relative">
              <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input 
                type="text" 
                [(ngModel)]="searchTerm" 
                (keyup.enter)="searchUsers()"
                placeholder="Search by name, email, or ID..." 
                class="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl text-gray-800 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 transition-all"
              >
            </div>
          </div>
          
          <!-- Filter -->
          <div class="relative">
            <select class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all appearance-none">
              <option>All Users</option>
              <option>Active Users</option>
              <option>Inactive Users</option>
              <option>Admins</option>
            </select>
            <i class="fas fa-chevron-down absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
          </div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <!-- Table Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              All Users <span class="text-gray-500 dark:text-gray-400 font-normal">({{ users.length }})</span>
            </h3>
            <div class="flex items-center space-x-2">
              <button class="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                <i class="fas fa-download"></i>
              </button>
              <button class="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                <i class="fas fa-filter"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  <input type="checkbox" class="rounded border-gray-300 dark:border-gray-600">
                </th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr *ngFor="let user of users" class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                <!-- Checkbox -->
                <td class="px-6 py-4">
                  <input type="checkbox" class="rounded border-gray-300 dark:border-gray-600">
                </td>

                <!-- User Info -->
                <td class="px-6 py-4">
                  <div class="flex items-center space-x-3">
                    <div class="relative">
                      <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {{ user.name.charAt(0).toUpperCase() }}
                      </div>
                      <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                    </div>
                    <div>
                      <p class="font-semibold text-gray-900 dark:text-white">{{ user.name }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">ID: {{ user.id }}</p>
                    </div>
                  </div>
                </td>

                <!-- Email -->
                <td class="px-6 py-4">
                  <div class="flex items-center space-x-2">
                    <i class="fas fa-envelope text-gray-400 text-sm"></i>
                    <span class="text-gray-700 dark:text-gray-300">{{ user.email }}</span>
                  </div>
                </td>

                <!-- Role -->
                <td class="px-6 py-4">
                  <span 
                    [class]="user.is_admin 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
                    class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold"
                  >
                    <i [class]="user.is_admin ? 'fas fa-crown mr-1.5' : 'fas fa-user mr-1.5'"></i>
                    {{ user.is_admin ? 'Admin' : 'User' }}
                  </span>
                </td>

                <!-- Status -->
                <td class="px-6 py-4">
                  <span class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    <i class="fas fa-circle text-xs mr-1.5 animate-pulse"></i>
                    Active
                  </span>
                </td>

                <!-- Joined Date -->
                <td class="px-6 py-4">
                  <div class="flex items-center space-x-2">
                    <i class="fas fa-calendar text-gray-400 text-sm"></i>
                    <span class="text-gray-700 dark:text-gray-300 text-sm">{{ user.created_at | date:'MMM d, y' }}</span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4">
                  <div class="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      class="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <i class="fas fa-eye"></i>
                    </button>
                    <button 
                      class="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                      title="Edit User"
                    >
                      <i class="fas fa-edit"></i>
                    </button>
                    <button 
                      (click)="banUser(user)"
                      class="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Ban User"
                    >
                      <i class="fas fa-ban"></i>
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Empty State -->
              <tr *ngIf="users.length === 0">
                <td colspan="7" class="px-6 py-12 text-center">
                  <div class="flex flex-col items-center justify-center">
                    <div class="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                      <i class="fas fa-users text-3xl text-gray-400"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No users found</h3>
                    <p class="text-gray-500 dark:text-gray-400">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Showing <span class="font-semibold text-gray-900 dark:text-white">{{ users.length }}</span> users
              <span class="mx-2">•</span>
              Page <span class="font-semibold text-gray-900 dark:text-white">{{ currentPage }}</span> of 
              <span class="font-semibold text-gray-900 dark:text-white">{{ totalPages }}</span>
            </div>
            
            <div class="flex items-center space-x-2">
              <button 
                [disabled]="currentPage === 1"
                (click)="changePage(currentPage - 1)"
                class="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                <i class="fas fa-chevron-left mr-2"></i> Previous
              </button>
              
              <!-- Page Numbers -->
              <div class="hidden sm:flex items-center space-x-1">
                <button 
                  *ngFor="let page of getPageNumbers()"
                  (click)="changePage(page)"
                  [class.bg-gradient-to-r]="page === currentPage"
                  [class.from-indigo-600]="page === currentPage"
                  [class.to-purple-600]="page === currentPage"
                  [class.text-white]="page === currentPage"
                  [class.shadow-lg]="page === currentPage"
                  class="w-10 h-10 flex items-center justify-center rounded-lg font-semibold text-sm transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
                  [class.text-gray-700]="page !== currentPage"
                  [class.dark:text-gray-300]="page !== currentPage"
                >
                  {{ page }}
                </button>
              </div>
              
              <button 
                [disabled]="currentPage === totalPages"
                (click)="changePage(currentPage + 1)"
                class="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                Next <i class="fas fa-chevron-right ml-2"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UserManagementComponent implements OnInit {
  users: any[] = [];
  searchTerm: string = '';
  currentPage: number = 1;
  totalPages: number = 1;

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.adminService.getUsers(this.currentPage, this.searchTerm).subscribe({
      next: (data) => {
        this.users = data.users;
        this.totalPages = data.pages;
        this.currentPage = data.page;
      },
      error: (err) => console.error('Failed to load users', err)
    });
  }

  searchUsers() {
    this.currentPage = 1;
    this.loadUsers();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);

    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  banUser(user: any) {
    if (confirm(`Are you sure you want to ban ${user.name}?`)) {
      this.adminService.banUser(user.id).subscribe({
        next: () => {
          alert('User banned successfully');
          this.loadUsers();
        },
        error: (err) => alert('Failed to ban user')
      });
    }
  }
}
