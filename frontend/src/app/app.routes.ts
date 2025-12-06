import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { FeaturesComponent } from './pages/features/features.component';
import { AboutComponent } from './pages/about/about.component';
import { LoginComponent } from './pages/login/login.component';
import { OnboardingComponent } from './pages/onboarding/onboarding.component';
import { ChatComponent } from './pages/chat/chat.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard, loginGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', component: HomeComponent, pathMatch: 'full' },
    { path: 'features', component: FeaturesComponent },
    { path: 'about', component: AboutComponent },
    { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
    { path: 'onboarding', component: OnboardingComponent, canActivate: [authGuard] },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'explore', pathMatch: 'full' },
            { path: 'chat', component: ChatComponent },
            { path: 'chat/:userId', component: ChatComponent },
            {
                path: 'profile',
                loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
            },
            {
                path: 'profile/:id',
                loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
            },
            {
                path: 'profile/:id/comments',
                loadComponent: () => import('./pages/all-comments/all-comments.component').then(m => m.AllCommentsComponent)
            },
            {
                path: 'guests',
                loadComponent: () => import('./pages/guests/guests.component').then(m => m.GuestsComponent)
            },
            {
                path: 'conversations',
                loadComponent: () => import('./pages/conversations/conversations.component').then(m => m.ConversationsComponent)
            },
            {
                path: 'explore',
                loadComponent: () => import('./pages/explore/explore.component').then(m => m.ExploreComponent)
            }
        ]
    },
    {
        path: 'admin',
        loadChildren: () => import('./pages/admin/admin.routes').then(m => m.ADMIN_ROUTES)
    }
];
