import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { FeaturesComponent } from './pages/features/features.component';
import { AboutComponent } from './pages/about/about.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
import { TermsOfServiceComponent } from './components/terms-of-service/terms-of-service.component';
import { ContactUsComponent } from './components/contact-us/contact-us.component';
import { LoginComponent } from './pages/login/login.component';
import { OnboardingComponent } from './pages/onboarding/onboarding.component';
import { ChatComponent } from './pages/chat/chat.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard, loginGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
    { path: '', component: HomeComponent, pathMatch: 'full', canActivate: [loginGuard] },
    { path: 'features', component: FeaturesComponent },
    { path: 'about', component: AboutComponent },
    { path: 'privacy', component: PrivacyPolicyComponent },
    { path: 'terms', component: TermsOfServiceComponent },
    { path: 'contact', component: ContactUsComponent },
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
                path: 'profile/:id/followers',
                loadComponent: () => import('./pages/follows/follows.component').then(m => m.FollowsComponent)
            },
            {
                path: 'profile/:id/following',
                loadComponent: () => import('./pages/follows/follows.component').then(m => m.FollowsComponent)
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
            },
            {
                path: 'community',
                loadComponent: () => import('./pages/community/community.component').then(m => m.CommunityComponent)
            },
            {
                path: 'games',
                loadComponent: () => import('./pages/games/games.component').then(m => m.GamesComponent)
            },
            {
                path: 'games/checkers',
                loadComponent: () => import('./pages/games/checkers/checkers.component').then(m => m.CheckersComponent)
            },
            {
                path: 'games/arrows',
                loadComponent: () => import('./pages/games/arrows/arrows.component').then(m => m.ArrowsComponent)
            },
            {
                path: 'games/quiz',
                loadComponent: () => import('./pages/games/language-game/language-game.component').then(m => m.LanguageGameComponent)
            },
            {
                path: 'games/anagram',
                loadComponent: () => import('./pages/games/language-game/language-game.component').then(m => m.LanguageGameComponent)
            },
            {
                path: 'voice-rooms',
                loadComponent: () => import('./pages/voice-rooms-list/voice-rooms-list.component').then(m => m.VoiceRoomsListComponent)
            },
            {
                path: 'voice-room/:roomId',
                loadComponent: () => import('./pages/voice-room/voice-room.component').then(m => m.VoiceRoomComponent)
            },
            {
                path: 'coins',
                loadComponent: () => import('./pages/coins/coins.component').then(m => m.CoinsComponent)
            },
            {
                path: 'learning',
                loadComponent: () => import('./pages/learning/learning.component').then(m => m.LearningComponent)
            },
            {
                path: 'leaderboard',
                loadComponent: () => import('./pages/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent)
            }
        ]
    },
    {
        path: 'admin',
        loadChildren: () => import('./pages/admin/admin.routes').then(m => m.ADMIN_ROUTES),
        canActivate: [AdminGuard]
    },
    {
        path: '404',
        loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFound)
    },
    { path: '**', redirectTo: '/404' }
];
