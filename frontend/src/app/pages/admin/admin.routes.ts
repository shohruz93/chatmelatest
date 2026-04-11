import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminUsersComponent } from './admin-users.component';

export const ADMIN_ROUTES: Routes = [
    {
        path: '',
        component: AdminLayoutComponent,
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: AdminDashboardComponent },
            { path: 'users', component: AdminUsersComponent },
            {
                path: 'support',
                loadComponent: () => import('./support-chat/support-chat.component').then(m => m.SupportChatComponent)
            },
            {
                path: 'apps',
                loadComponent: () => import('./app-versions/app-versions.component').then(m => m.AppVersionsComponent)
            },
            {
                path: 'community',
                loadComponent: () => import('./admin-community/admin-community.component').then(m => m.AdminCommunityComponent)
            }
        ]
    }
];