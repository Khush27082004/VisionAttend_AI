import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacultyDashboard } from './faculty-dashboard';

describe('FacultyDashboard', () => {
  let component: FacultyDashboard;
  let fixture: ComponentFixture<FacultyDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacultyDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(FacultyDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
