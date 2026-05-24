import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth';
  private tokenKey = 'ecoloop_token';
  private refreshTokenKey = 'ecoloop_refresh_token';
  private userKey = 'ecoloop_user';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData).pipe(
      tap({
        next: (response: any) => {
          this.persistAuthResponse(response);
        },
        error: () => {}
      }),
      catchError(this.handleError)
    );
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap({
        next: (response: any) => {
          this.persistAuthResponse(response);
        },
        error: () => {}
      }),
      catchError(this.handleError)
    );
  }

  getProfile(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/profile`, { headers });
  }

  updateProfile(profileData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/profile`, profileData, { headers }).pipe(
      tap((response: any) => {
        if (response?.user) {
          this.setUser(response.user);
        }
      }),
      catchError(this.handleError)
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    // You could also check if token is expired here
    return true;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): any {
    const user = localStorage.getItem(this.userKey);
    if (user) {
      try {
        return JSON.parse(user);
      } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
      }
    }
    return null;
  }

  getUserRole(): string {
    const user = this.getUser();
    return user ? user.role : '';
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private setUser(user: any): void {
    const userData = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      location: user.location,
      phone: user.phone || '',
      avatar: user.avatar || ''
    };
    localStorage.setItem(this.userKey, JSON.stringify(userData));
    window.dispatchEvent(new Event('ecoloop_user_updated'));
  }

  private persistAuthResponse(response: any): void {
    const accessToken = response?.tokens?.access || response?.token;
    const refreshToken = response?.tokens?.refresh || response?.refreshToken;
    const user = response?.user || response;

    if (accessToken) {
      this.setToken(accessToken);
    }

    if (refreshToken) {
      localStorage.setItem(this.refreshTokenKey, refreshToken);
    }

    if (user?._id) {
      this.setUser(user);
    }
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message = error.error?.message || 'Something went wrong. Please try again.';
    return throwError(() => new Error(message));
  }
}
