import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WebcamImage, WebcamModule } from 'ngx-webcam';
import { Subject } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AiService } from '../../../services/ai';
import { StudentService } from '../../../core/services/student';

@Component({
  selector: 'app-face-registration', standalone: true,
  imports: [CommonModule, WebcamModule, MatButtonModule, MatCardModule, MatSnackBarModule, MatProgressSpinnerModule],
  templateUrl: './face-registration.html', styleUrl: './face-registration.scss'
})
export class FaceRegistrationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ai = inject(AiService);
  private students = inject(StudentService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  studentId = Number(this.route.snapshot.paramMap.get('id'));
  trigger = new Subject<void>();
  webcamImage: WebcamImage | null = null;
  saving = false;
  cameraError: string | null = null;
  isEditMode = false;

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user') ?? '{}');
    if (user.role === 'STUDENT') {
      this.students.getProfile().subscribe({
        next: (profile) => {
          if (profile.id !== this.studentId) {
            this.router.navigate([`/dashboard/students/${profile.id}/register-face`]);
            return;
          }
          this.isEditMode = !!profile.faceRegistered;
          this.cdr.detectChanges();
        },
        error: () => this.router.navigate(['/dashboard/student'])
      });
    }
  }

  get triggerObservable() { return this.trigger.asObservable(); }

  capture() { 
    this.saving = false;
    this.trigger.next(); 
    this.cdr.detectChanges();
  }

  handleImage(image: WebcamImage) { 
    this.webcamImage = image; 
    this.saving = false;
    this.cdr.detectChanges();
  }

  handleCameraError(error: any) {
    this.cameraError = error.message || 'Camera permission denied or device not found.';
    this.snackBar.open(this.cameraError || 'Camera error', 'Close', { duration: 5000 });
    this.cdr.detectChanges();
  }

  register() {
    if (!this.webcamImage || !Number.isInteger(this.studentId)) return;
    this.saving = true;
    this.cdr.detectChanges();

    fetch(this.webcamImage.imageAsDataUrl)
      .then(response => response.blob())
      .then(blob => {
        const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });
        this.ai.registerFace(this.studentId, file).subscribe({
          next: result => {
            if (!result.success) {
              // AI returned validation error (no face, multiple faces, etc.)
              this.saving = false;
              this.snackBar.open(result.message || 'Face registration failed. Please capture again.', 'Close', { duration: 6000 });
              this.cdr.detectChanges();
              return;
            }
            this.students.markFaceRegistered(this.studentId).subscribe({
              next: () => {
                this.snackBar.open(this.isEditMode ? '✅ Face biometrics updated successfully!' : '✅ Face registered successfully!', 'Close', { duration: 4000 });
                this.saving = false;
                this.cdr.detectChanges();
                const user = JSON.parse(localStorage.getItem('user') ?? '{}');
                if (user.role === 'STUDENT') {
                  this.router.navigate(['/dashboard/student']);
                } else {
                  this.router.navigate(['/dashboard/students']);
                }
              },
              error: () => this.finish('Face was stored, but the student record could not be updated.')
            });
          },
          error: (err: any) => {
            const msg = err.error?.message || 'Face registration service is unavailable. Please ensure AI service is running.';
            this.finish(msg);
          }
        });
      })
      .catch(() => {
        this.finish('Failed to process captured image.');
      });
  }

  private finish(message: string) { 
    this.saving = false; 
    this.snackBar.open(message, 'Close', { duration: 5000 }); 
    this.cdr.detectChanges();
  }
}
