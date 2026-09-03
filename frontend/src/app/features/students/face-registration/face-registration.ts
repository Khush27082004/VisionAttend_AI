import { Component, inject, OnInit } from '@angular/core';
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

  studentId = Number(this.route.snapshot.paramMap.get('id'));
  trigger = new Subject<void>();
  webcamImage: WebcamImage | null = null;
  saving = false;
  cameraError: string | null = null;

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user') ?? '{}');
    if (user.role === 'STUDENT') {
      this.students.getProfile().subscribe({
        next: (profile) => {
          if (profile.id !== this.studentId) {
            this.router.navigate([`/dashboard/students/${profile.id}/register-face`]);
          }
        },
        error: () => this.router.navigate(['/dashboard/student'])
      });
    }
  }

  get triggerObservable() { return this.trigger.asObservable(); }
  capture() { this.trigger.next(); }
  handleImage(image: WebcamImage) { this.webcamImage = image; }

  handleCameraError(error: any) {
    this.cameraError = error.message || 'Camera permission denied or device not found.';
    this.snackBar.open(this.cameraError || 'Camera error', 'Close', { duration: 5000 });
  }

  register() {
    if (!this.webcamImage || !Number.isInteger(this.studentId)) return;
    this.saving = true;
    fetch(this.webcamImage.imageAsDataUrl).then(response => response.blob()).then(blob => {
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });
      this.ai.registerFace(this.studentId, file).subscribe({
        next: result => {
          if (!result.success) { this.finish(result.message); return; }
          this.students.markFaceRegistered(this.studentId).subscribe({
            next: () => {
              this.finish('Face registered successfully');
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
        error: () => this.finish('Face registration service is unavailable.')
      });
    });
  }

  private finish(message: string) { this.saving = false; this.snackBar.open(message, 'Close', { duration: 4000 }); }
}
