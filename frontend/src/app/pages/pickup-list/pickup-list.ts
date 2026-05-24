import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PickupService } from '../../services/pickup.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-pickup-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pickup-list.html',
  styleUrls: ['./pickup-list.css']
})
export class PickupListComponent implements OnInit {
  pickups: any[] = [];
  statusFilter: string = 'all';
  searchTerm: string = '';
  userRole: string = '';
  userId: string = '';
  actionMessage = '';
  errorMessage = '';
  chatDrafts: Record<string, string> = {};
  reportDrafts: Record<string, { reason: string; details: string }> = {};

  constructor(
    private pickupService: PickupService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.userRole = this.authService.getUserRole();
    const user = this.authService.getUser();
    this.userId = user?._id;
    this.loadPickups();
  }

  loadPickups() {
    this.pickupService.getPickups().subscribe({
      next: (data) => {
        this.pickups = Array.isArray(data) ? data : [];
        this.pickups.forEach((pickup) => {
          if (!this.reportDrafts[pickup._id]) {
            this.reportDrafts[pickup._id] = { reason: '', details: '' };
          }
        });
      },
      error: (error) => {
        console.error('Error loading pickups:', error);
      }
    });
  }

  updateStatus(pickupId: string, status: string) {
    this.actionMessage = '';
    this.errorMessage = '';
    this.pickupService.updatePickupStatus(pickupId, status).subscribe({
      next: () => {
        this.actionMessage = status === 'rejected' ? 'Pickup rejected.' : `Pickup marked ${status}.`;
        this.loadPickups();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || error.message || 'Error updating pickup status';
      }
    });
  }

  sendMessage(pickup: any) {
    const message = (this.chatDrafts[pickup._id] || '').trim();
    if (!message) {
      return;
    }

    this.pickupService.sendMessage(pickup._id, message).subscribe({
      next: () => {
        this.chatDrafts[pickup._id] = '';
        this.loadPickups();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || error.message || 'Unable to send message';
      }
    });
  }

  reportPickup(pickup: any) {
    const draft = this.reportDrafts[pickup._id] || { reason: '', details: '' };
    if (!draft.reason.trim()) {
      this.errorMessage = 'Add a report reason first.';
      return;
    }

    this.pickupService.reportPickup(pickup._id, draft).subscribe({
      next: () => {
        this.actionMessage = 'Report submitted to admin.';
        this.reportDrafts[pickup._id] = { reason: '', details: '' };
        this.loadPickups();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || error.message || 'Unable to report pickup';
      }
    });
  }

  get filteredPickups(): any[] {
    return this.pickups.filter((pickup) => {
      const matchesStatus = this.statusFilter === 'all' || pickup.status === this.statusFilter;
      const search = this.searchTerm.trim().toLowerCase();
      const text = [
        pickup.wasteType,
        pickup.pickupAddress,
        pickup.description,
        pickup.user?.fullName,
        pickup.assignedVolunteer?.fullName
      ].join(' ').toLowerCase();

      return matchesStatus && (!search || text.includes(search));
    });
  }

  get counts() {
    return {
      total: this.pickups.length,
      pending: this.pickups.filter((pickup) => pickup.status === 'pending').length,
      accepted: this.pickups.filter((pickup) => pickup.status === 'accepted').length,
      completed: this.pickups.filter((pickup) => pickup.status === 'completed').length
    };
  }

  get volunteerPoints(): number {
    return this.pickups
      .filter((pickup) => pickup.status === 'completed' && this.getAssignedVolunteerId(pickup) === this.userId)
      .length * 25;
  }

  getAssignedVolunteerId(pickup: any): string {
    return pickup.assignedVolunteer?._id || pickup.assignedVolunteer || '';
  }

  getWasteIcon(type: string): string {
    const icons: Record<string, string> = {
      plastic: 'fa-bottle-water',
      paper: 'fa-newspaper',
      glass: 'fa-wine-bottle',
      metal: 'fa-gears',
      organic: 'fa-seedling',
      electronic: 'fa-microchip'
    };

    return icons[type] || 'fa-recycle';
  }

  canChat(pickup: any): boolean {
    return this.userRole === 'admin' || pickup.user?._id === this.userId || this.getAssignedVolunteerId(pickup) === this.userId;
  }

  canReport(pickup: any): boolean {
    return this.userRole === 'user' && pickup.user?._id === this.userId;
  }

  getMapsUrl(pickup: any): string {
    const query = pickup.mapPlace || pickup.pickupAddress || '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  getMapsEmbedUrl(pickup: any): SafeResourceUrl {
    const query = pickup.mapPlace || pickup.pickupAddress || 'recycling center near me';
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`);
  }
}
