import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PickupService } from '../../services/pickup.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-create-pickup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './create-pickup.html',
  styleUrls: ['./create-pickup.css']
})
export class CreatePickupComponent {
  pickupForm: FormGroup;
  successMessage: string = '';
  errorMessage: string = '';
  minDate = new Date().toISOString().split('T')[0];
  userRole = '';
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private pickupService: PickupService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {
    this.userRole = this.authService.getUserRole();
    this.pickupForm = this.fb.group({
      wasteType: ['', Validators.required],
      pickupAddress: ['', [Validators.required, Validators.minLength(10)]],
      preferredDate: ['', Validators.required],
      quantity: ['', Validators.required],
      contactPhone: [''],
      mapPlace: [''],
      description: ['']
    });
  }

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.pickupForm.invalid) {
      this.pickupForm.markAllAsTouched();
      return;
    }

    if (this.pickupForm.valid) {
      this.isSubmitting = true;
      this.pickupService.createPickup(this.pickupForm.value).subscribe({
        next: () => {
          this.successMessage = this.userRole === 'admin'
            ? 'Pickup created and published to volunteers.'
            : 'Pickup request created successfully!';
          setTimeout(() => {
            this.router.navigate(['/pickups']);
          }, 2000);
        },
        error: (error) => {
          this.errorMessage = error.error?.message || error.message || 'Failed to create pickup request';
          this.isSubmitting = false;
        }
      });
    }
  }

  useAddressForMap() {
    const address = this.pickupForm.get('pickupAddress')?.value || '';
    this.pickupForm.patchValue({ mapPlace: address });
  }

  getGoogleMapsUrl(): string {
    const query = this.pickupForm.get('mapPlace')?.value || this.pickupForm.get('pickupAddress')?.value || '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  getGoogleMapsEmbedUrl(): SafeResourceUrl {
    const query = this.pickupForm.get('mapPlace')?.value || this.pickupForm.get('pickupAddress')?.value || 'recycling center near me';
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`);
  }
}
