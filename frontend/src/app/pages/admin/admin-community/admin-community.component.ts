import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../services/admin.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-admin-community',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 dark:text-white">Community Posts</h1>
          <p class="text-sm text-slate-500 mt-1">Manage and monitor all community content</p>
        </div>
        <div class="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold">
          Total Posts: {{ totalPosts }}
        </div>
      </div>

      <div class="bg-white dark:bg-[#151921] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800/50 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800/50 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th class="px-6 py-4">User</th>
                <th class="px-6 py-4">Content Type</th>
                <th class="px-6 py-4">Preview</th>
                <th class="px-6 py-4">Created At</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
              @for (post of posts; track post.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors group">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden ring-2 ring-slate-100 dark:ring-slate-800/50">
                        <img [src]="getAvatarUrl(post.user_avatar)" class="w-full h-full object-cover" [alt]="post.user_name">
                      </div>
                      <div>
                        <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ post.user_name }}</div>
                        <div class="text-[10px] text-slate-400">ID: {{ post.user_id }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span [class]="'px-2 py-1 rounded text-[10px] font-bold uppercase ' + getBadgeClass(post.content_type)">
                      {{ post.content_type }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <button (click)="openModal(post)" class="text-left group/preview block w-full">
                      <div class="max-w-xs">
                        @if (post.content_type === 'text') {
                          <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic group-hover/preview:text-blue-500 transition-colors">"{{ post.text_content }}"</p>
                        } @else {
                          <div class="flex items-center gap-2 text-xs text-blue-500 font-medium group-hover/preview:scale-105 transition-transform origin-left">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            View {{ post.content_type }}
                          </div>
                        }
                      </div>
                    </button>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-xs text-slate-500 dark:text-slate-400">
                      {{ formatTime(post.created_at) }}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button (click)="deletePost(post.id)" 
                            class="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all transform hover:scale-110 active:scale-95"
                            title="Delete Post">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (loading) {
          <div class="flex justify-center p-12">
            <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }

        @if (posts.length === 0 && !loading) {
          <div class="p-12 text-center">
            <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 class="text-slate-800 dark:text-white font-semibold">No posts found</h3>
            <p class="text-sm text-slate-500">The community is quiet... for now.</p>
          </div>
        }

        <div class="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/10 border-t border-slate-200 dark:border-slate-800/50 flex items-center justify-between">
          <div class="text-xs text-slate-500">
            Showing {{ posts.length }} of {{ totalPosts }} posts
          </div>
          <div class="flex gap-2">
            <button [disabled]="currentPage === 1 || loading" (click)="loadPage(currentPage - 1)"
                    class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151921] text-slate-600 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Previous
            </button>
            <button [disabled]="currentPage >= totalPages || loading" (click)="loadPage(currentPage + 1)"
                    class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151921] text-slate-600 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Post Detail Modal -->
    @if (selectedPost) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="closeModal()"></div>
        
        <!-- Modal Content -->
        <div class="relative bg-white dark:bg-[#151921] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <!-- Modal Header -->
          <div class="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img [src]="getAvatarUrl(selectedPost.user_avatar)" class="w-10 h-10 rounded-full object-cover">
              <div>
                <h3 class="text-sm font-bold text-slate-800 dark:text-white">{{ selectedPost.user_name }}</h3>
                <p class="text-[10px] text-slate-400 uppercase tracking-wider">{{ formatTime(selectedPost.created_at) }}</p>
              </div>
            </div>
            <button (click)="closeModal()" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            @if (selectedPost.text_content) {
              <div class="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {{ selectedPost.text_content }}
              </div>
            }

            @if (selectedPost.media_path) {
              <div class="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-black flex items-center justify-center min-h-[300px]">
                @if (selectedPost.content_type === 'image') {
                  <img [src]="getMediaUrl(selectedPost.media_path)" class="max-w-full max-h-[500px] object-contain" alt="Post media">
                } @else if (selectedPost.content_type === 'video') {
                  <video [src]="getMediaUrl(selectedPost.media_path)" controls class="max-w-full max-h-[500px]"></video>
                }
              </div>
            }
          </div>

          <!-- Modal Footer -->
          <div class="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800/50 flex justify-end gap-3">
            <button (click)="closeModal()" class="px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              Close
            </button>
            <button (click)="deletePost(selectedPost.id); closeModal()" class="px-6 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/20 transition-all">
              Delete Post
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class AdminCommunityComponent implements OnInit {
  posts: any[] = [];
  totalPosts: number = 0;
  currentPage: number = 1;
  totalPages: number = 1;
  loading: boolean = false;
  selectedPost: any = null;

  constructor(
    private adminService: AdminService,
    private titleService: Title
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Admin | Community Posts');
    this.loadPosts();
  }

  loadPosts(page: number = 1) {
    this.loading = true;
    this.currentPage = page;
    this.adminService.getCommunityPosts(page).subscribe({
      next: (resp: any) => {
        this.posts = resp.posts;
        this.totalPosts = resp.total;
        this.totalPages = resp.pages;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading posts:', err);
        this.loading = false;
      }
    });
  }

  loadPage(page: number) {
    this.loadPosts(page);
  }

  openModal(post: any) {
    this.selectedPost = post;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.selectedPost = null;
    document.body.style.overflow = '';
  }

  deletePost(postId: number) {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      this.adminService.deleteCommunityPost(postId).subscribe({
        next: () => {
          this.posts = this.posts.filter(p => p.id !== postId);
          this.totalPosts--;
        },
        error: (err) => {
          console.error('Error deleting post:', err);
          alert('Failed to delete post');
        }
      });
    }
  }

  getAvatarUrl(avatar: string): string {
    if (!avatar) return 'assets/images/placeholder-avatar.png'; // Use existing placeholder
    if (avatar.startsWith('http')) return avatar;
    return this.adminService.apiUrl + '/' + avatar;
  }

  getMediaUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Handle the double slash or missing slash in base URL
    const baseUrl = this.adminService.apiUrl.endsWith('/') ? this.adminService.apiUrl.slice(0, -1) : this.adminService.apiUrl;
    const mediaPath = path.startsWith('/') ? path : '/' + path;
    return baseUrl + mediaPath;
  }

  getBadgeClass(type: string): string {
    switch (type) {
      case 'text': return 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400';
      case 'image': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'video': return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }
}
