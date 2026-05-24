import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {
  user: any;
  recentPickups: any[] = [];
  isEditing = false;
  isSaving = false;
  successMessage = '';
  errorMessage = '';
  editProfile = {
    fullName: '',
    location: '',
    phone: '',
    avatar: ''
  };
  avatarChoices = ['🌱', '🌿', '🌳', '🍀', '♻️', '🌎', '☀️', '💧', '🦸', '👤'];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.authService.getUser();
    this.syncEditForm();

    this.authService.getProfile().subscribe({
      next: (profile: any) => {
        this.user = profile?.user || profile;
        this.recentPickups = profile?.recentPickups || [];
        this.syncEditForm();
      },
      error: (error) => {
        console.error('Error loading profile:', error);
      }
    });
  }

  get displayAvatar(): string {
    return this.user?.avatar || this.editProfile.avatar || this.user?.fullName?.charAt(0)?.toUpperCase() || 'E';
  }

  get stats() {
    return this.user?.stats || {};
  }

  get profileCompletion(): number {
    const fields = [this.user?.fullName, this.user?.email, this.user?.location, this.user?.phone, this.user?.avatar];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }

  startEditing() {
    this.isEditing = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.syncEditForm();
  }

  cancelEditing() {
    this.isEditing = false;
    this.syncEditForm();
  }

  selectAvatar(avatar: string) {
    this.editProfile.avatar = avatar;
  }

  saveProfile() {
    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.authService.updateProfile(this.editProfile).subscribe({
      next: (response: any) => {
        this.user = response?.user || { ...this.user, ...this.editProfile };
        this.isEditing = false;
        this.isSaving = false;
        this.successMessage = 'Profile updated successfully.';
        this.syncEditForm();
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = error.message || 'Could not update your profile.';
      }
    });
  }

  private syncEditForm() {
    this.editProfile = {
      fullName: this.user?.fullName || '',
      location: this.user?.location || '',
      phone: this.user?.phone || '',
      avatar: this.user?.avatar || '🌱'
    };
  }

logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  this.router.navigate(['/']);
}
