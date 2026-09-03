import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceCameraComponent } from './attendance-camera';

describe('AttendanceCamera', () => {
  let component: AttendanceCameraComponent;
  let fixture: ComponentFixture<AttendanceCameraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceCameraComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceCameraComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
