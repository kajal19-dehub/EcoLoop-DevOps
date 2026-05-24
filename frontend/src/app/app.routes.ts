import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LandingComponent } from './pages/landing/landing';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { CreatePickupComponent } from './pages/create-pickup/create-pickup';
import { PickupListComponent } from './pages/pickup-list/pickup-list';
import { ProfileComponent } from './pages/profile/profile';
import { AboutComponent } from './pages/about/about';
import { ArticlesComponent } from './pages/articles/articles';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'about', component: AboutComponent },
  { path: 'articles', component: ArticlesComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'create-pickup', component: CreatePickupComponent, canActivate: [AuthGuard] },
  { path: 'pickups', component: PickupListComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];