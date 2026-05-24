import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://ecoloop-devops-production.up.railway.app';
  private tokenKey = 'ecoloop_token';
  private refreshTokenKey = 'ecoloop_refresh_token';
  private userKey = 'ecoloop_user';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Auth methods
  register(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, userData).pipe(
      tap((response: any) => {
        if (response.tokens) {
          this.setTokens(response.tokens);
          this.setUser(response.user);
        }
      }),
      catchError(this.handleError)
    );
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap((response: any) => {
        if (response.tokens) {
          this.setTokens(response.tokens);
          this.setUser(response.user);
        }
      }),
      catchError(this.handleError)
    );
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/auth/profile`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/auth/profile`, data, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // Pickup methods
  createPickup(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/pickups`, data, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getPickups(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/pickups`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getPickupById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/pickups/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  updatePickupStatus(id: string, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/pickups/${id}/status`, { status }, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // Statistics
  getStatistics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/statistics`)
      .pipe(catchError(this.handleError));
  }

  getRewards(): Observable<any> {
    return this.http.get(`${this.baseUrl}/rewards`)
      .pipe(catchError(this.handleError));
  }

  // Notifications
  getNotifications(): Observable<any> {
    return this.http.get(`${this.baseUrl}/notifications`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  markNotificationRead(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/notifications/${id}/read`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // Admin
  getAdminDashboard(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/dashboard`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getAdminUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/users`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // Token management
  private setTokens(tokens: any): void {
    localStorage.setItem(this.tokenKey, tokens.access);
    if (tokens.refresh) {
      localStorage.setItem(this.refreshTokenKey, tokens.refresh);
    }
  }

  private setUser(user: any): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.tokenKey);
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): any {
    const user = localStorage.getItem(this.userKey);
    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user);
    } catch {
      localStorage.removeItem(this.userKey);
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserRole(): string {
    const user = this.getUser();
    return user?.role || '';
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/login']);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred. Please try again.';

    if (error.error?.message) {
      errorMessage = error.error.message;
    }

    if (error.status === 401) {
      // Auto logout if unauthorized
      this.logout();
    }

    return throwError(() => new Error(errorMessage));
  }
}
