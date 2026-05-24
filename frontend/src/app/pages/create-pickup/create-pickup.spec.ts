import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { CreatePickupComponent } from './create-pickup';

describe('CreatePickupComponent', () => {
  let component: CreatePickupComponent;
  let fixture: ComponentFixture<CreatePickupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatePickupComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CreatePickupComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
