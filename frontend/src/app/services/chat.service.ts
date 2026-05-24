import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'https://ecoloop-devops-production.up.railway.app';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getMessages(): Observable<any[]> {
    return this.http.get(this.apiUrl, { headers: this.authService.getAuthHeaders() }).pipe(
      map((response: any) => response.data || [])
    );
  }

  sendMessage(message: string): Observable<any> {
    return this.http.post(this.apiUrl, { message }, { headers: this.authService.getAuthHeaders() });
  }
}
