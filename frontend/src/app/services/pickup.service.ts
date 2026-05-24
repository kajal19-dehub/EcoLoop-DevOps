import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PickupService {
  private apiUrl = 'https://ecoloop-devops-production.up.railway.app/api/pickups';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  createPickup(pickupData: any): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post(this.apiUrl, pickupData, { headers });
  }

  getPickups(): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get(this.apiUrl, { headers }).pipe(
      map((response: any) => response.data || response)
    );
  }

  updatePickupStatus(id: string, status: string, notes = ''): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/${id}/status`, { status, notes }, { headers });
  }

  reportPickup(id: string, report: any): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/${id}/report`, report, { headers });
  }

  sendMessage(id: string, message: string): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/${id}/chat`, { message }, { headers });
  }
}
