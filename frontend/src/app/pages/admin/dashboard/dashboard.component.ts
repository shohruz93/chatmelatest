import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          <i class="fas fa-clock mr-2"></i>
          Last updated: {{ currentTime | date:'short' }}
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Total Users Card -->
        <div class="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div class="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div class="relative p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50 group-hover:scale-110 transition-transform">
                <i class="fas fa-users text-2xl text-white"></i>
              </div>
              <div class="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
                +12.5%
              </div>
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Users</p>
              <h3 class="text-4xl font-bold text-gray-900 dark:text-white mt-2">{{ stats.total_users }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <i class="fas fa-arrow-up text-green-500 mr-1"></i>
                <span class="text-green-500 font-semibold">+{{ stats.new_users_today || 0 }}</span> new today
              </p>
            </div>
          </div>
          <div class="h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
        </div>

        <!-- Active Users Card -->
        <div class="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div class="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div class="relative p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/50 group-hover:scale-110 transition-transform">
                <i class="fas fa-user-check text-2xl text-white"></i>
              </div>
              <div class="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-semibold">
                Live
              </div>
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active Users</p>
              <h3 class="text-4xl font-bold text-gray-900 dark:text-white mt-2">{{ stats.active_users }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <i class="fas fa-circle text-green-500 mr-1 animate-pulse"></i>
                Online in last 24h
              </p>
            </div>
          </div>
          <div class="h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
        </div>

        <!-- Total Messages Card -->
        <div class="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div class="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div class="relative p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform">
                <i class="fas fa-comments text-2xl text-white"></i>
              </div>
              <div class="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs font-semibold">
                +8.2%
              </div>
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Messages</p>
              <h3 class="text-4xl font-bold text-gray-900 dark:text-white mt-2">{{ stats.total_messages }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <i class="fas fa-arrow-up text-green-500 mr-1"></i>
                <span class="text-green-500 font-semibold">+{{ stats.messages_today || 0 }}</span> today
              </p>
            </div>
          </div>
          <div class="h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
        </div>
      </div>

      <!-- Additional Stats Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Chat Rooms -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border-l-4 border-indigo-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Active Chats</p>
              <h4 class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ stats.active_chats || 0 }}</h4>
            </div>
            <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <i class="fas fa-comment-dots text-xl text-indigo-600 dark:text-indigo-400"></i>
            </div>
          </div>
        </div>

        <!-- Reports -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border-l-4 border-red-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reports</p>
              <h4 class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ stats.reports || 0 }}</h4>
            </div>
            <div class="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <i class="fas fa-flag text-xl text-red-600 dark:text-red-400"></i>
            </div>
          </div>
        </div>

        <!-- Avg Response Time -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border-l-4 border-yellow-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Avg Response</p>
              <h4 class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ stats.avg_response || '2.5' }}m</h4>
            </div>
            <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <i class="fas fa-clock text-xl text-yellow-600 dark:text-yellow-400"></i>
            </div>
          </div>
        </div>

        <!-- Success Rate -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border-l-4 border-teal-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Match Rate</p>
              <h4 class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ stats.match_rate || '94' }}%</h4>
            </div>
            <div class="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
              <i class="fas fa-heart text-xl text-teal-600 dark:text-teal-400"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts and Activity Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Activity -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h3>
            <button class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold">
              View All <i class="fas fa-arrow-right ml-1"></i>
            </button>
          </div>
          <div class="space-y-4">
            <div class="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-user-plus text-blue-600 dark:text-blue-400"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white">New user registered</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">John Doe joined the platform</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">2 minutes ago</p>
              </div>
            </div>
            <div class="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div class="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-comment text-green-600 dark:text-green-400"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white">New message sent</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">1,234 messages sent in the last hour</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">5 minutes ago</p>
              </div>
            </div>
            <div class="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-heart text-purple-600 dark:text-purple-400"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white">Successful match</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Users matched based on interests</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">12 minutes ago</p>
              </div>
            </div>
          </div>
        </div>

        <!-- System Status -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">System Status</h3>
            <span class="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-semibold">
              <i class="fas fa-circle text-xs mr-1"></i> All Systems Operational
            </span>
          </div>
          <div class="space-y-4">
            <!-- API Status -->
            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <i class="fas fa-server text-green-600 dark:text-green-400"></i>
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">API Server</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Response time: 45ms</p>
                </div>
              </div>
              <span class="text-green-600 dark:text-green-400 font-semibold text-sm">Healthy</span>
            </div>

            <!-- Database Status -->
            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <i class="fas fa-database text-green-600 dark:text-green-400"></i>
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">Database</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Query time: 12ms</p>
                </div>
              </div>
              <span class="text-green-600 dark:text-green-400 font-semibold text-sm">Healthy</span>
            </div>

            <!-- Socket Server Status -->
            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <i class="fas fa-plug text-green-600 dark:text-green-400"></i>
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">Socket Server</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ stats.active_users || 0 }} connections</p>
                </div>
              </div>
              <span class="text-green-600 dark:text-green-400 font-semibold text-sm">Healthy</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <div class="flex flex-col md:flex-row items-center justify-between">
          <div class="mb-4 md:mb-0">
            <h3 class="text-2xl font-bold mb-2">Quick Actions</h3>
            <p class="text-indigo-100">Manage your platform efficiently</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <button class="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-semibold transition-all transform hover:scale-105">
              <i class="fas fa-user-plus mr-2"></i> Add User
            </button>
            <button class="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-semibold transition-all transform hover:scale-105">
              <i class="fas fa-chart-bar mr-2"></i> View Reports
            </button>
            <button class="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-semibold transition-all transform hover:scale-105">
              <i class="fas fa-cog mr-2"></i> Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  stats: any = {
    total_users: 0,
    active_users: 0,
    total_messages: 0,
    new_users_today: 0,
    messages_today: 0,
    active_chats: 0,
    reports: 0,
    avg_response: '2.5',
    match_rate: '94'
  };

  currentTime = new Date();

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.loadStats();
    // Update time every minute
    setInterval(() => {
      this.currentTime = new Date();
    }, 60000);
  }

  loadStats() {
    this.adminService.getStats().subscribe({
      next: (data) => {
        this.stats = { ...this.stats, ...data };
      },
      error: (err) => {
        console.error('Failed to load stats', err);
      }
    });
  }
}
