import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from './services/api.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit {
  isLoggedIn = false;
  userRole: string = '';
  user: any = null;
  currentRoute: string = '';
  unreadNotifications = 0;
  isAppReady = true;
  notifications: any[] = [];
  showMobileMenu = false;
  showNotifications = false;
  showUserMenu = false;
  isDarkTheme = false;

  constructor(
    public apiService: ApiService,
    private router: Router
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.url;
      this.updateAuthState();
    });
  }

  ngOnInit() {
    this.isDarkTheme = localStorage.getItem('ecoloop_theme') === 'dark';
    this.applyTheme();
    this.updateAuthState();
    this.loadNotifications();
    window.addEventListener('ecoloop_user_updated', () => this.updateAuthState());
  }

  updateAuthState() {
    this.isLoggedIn = this.apiService.isLoggedIn();
    this.user = this.apiService.getUser();
    this.userRole = this.apiService.getUserRole();
  }

  loadNotifications() {
    if (this.isLoggedIn) {
      this.apiService.getNotifications().subscribe({
        next: (response: any) => {
          this.unreadNotifications = response.unread || 0;
          this.notifications = response.data || response.notifications || response.items || [];
        }
      });
    }
  }

  getNotifIcon(type: string): string {
    const icons: Record<string, string> = {
      success: 'fa-circle-check',
      warning: 'fa-triangle-exclamation',
      pickup: 'fa-truck',
      info: 'fa-circle-info'
    };

    return icons[type] || 'fa-circle-info';
  }

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('ecoloop_theme', this.isDarkTheme ? 'dark' : 'bright');
    this.applyTheme();
  }

  private applyTheme() {
    document.body.classList.toggle('dark-theme', this.isDarkTheme);
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  logout() {
    this.apiService.logout();
    this.isLoggedIn = false;
    this.router.navigate(['/']);
  }
}
