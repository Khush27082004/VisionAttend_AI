import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectSubject } from './select-subject';

describe('SelectSubject', () => {
  let component: SelectSubject;
  let fixture: ComponentFixture<SelectSubject>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectSubject],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectSubject);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
