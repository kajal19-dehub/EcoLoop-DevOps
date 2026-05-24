import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { PickupListComponent } from './pickup-list';

describe('PickupListComponent', () => {
  let component: PickupListComponent;
  let fixture: ComponentFixture<PickupListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PickupListComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PickupListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
