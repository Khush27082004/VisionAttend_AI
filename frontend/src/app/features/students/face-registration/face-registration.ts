import { Component, inject, OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WebcamImage, WebcamModule } from 'ngx-webcam';
import { Subject } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { AiService } from '../../../services/ai';
import { StudentService } from '../../../core/services/student';

@Component({
  selector: 'app-face-registration', standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    WebcamModule,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    MatIconModule
  ],
  templateUrl: './face-registration.html', styleUrl: './face-registration.scss'
})
export class FaceRegistrationComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ai = inject(AiService);
  private students = inject(StudentService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('cropCanvas') cropCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('previewCanvas') previewCanvasRef?: ElementRef<HTMLCanvasElement>;

  studentId = Number(this.route.snapshot.paramMap.get('id'));
  trigger = new Subject<void>();
  webcamImage: WebcamImage | null = null;
  loadedImage: HTMLImageElement | null = null;
  
  // Cropping & Adjustment Controls
  zoom = 1.0;          // 1.0x to 2.5x
  panX = 0;            // -150px to 150px
  panY = 0;            // -150px to 150px
  rotation = 0;        // -30deg to 30deg
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;

  saving = false;
  cameraError: string | null = null;
  isEditMode = false;
  currentStep: 'capture' | 'crop' = 'capture';

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

  ngAfterViewInit() {
    this.updateCropCanvas();
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
    this.resetAdjustments();
    this.currentStep = 'crop';

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.loadedImage = img;
      this.updateCropCanvas();
      this.cdr.detectChanges();
    };
    img.src = image.imageAsDataUrl;
  }

  resetAdjustments() {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.rotation = 0;
    this.updateCropCanvas();
  }

  retake() {
    this.webcamImage = null;
    this.loadedImage = null;
    this.currentStep = 'capture';
    this.resetAdjustments();
    this.cdr.detectChanges();
  }

  onZoomChange(val: number) {
    this.zoom = val;
    this.updateCropCanvas();
  }

  onPanXChange(val: number) {
    this.panX = val;
    this.updateCropCanvas();
  }

  onPanYChange(val: number) {
    this.panY = val;
    this.updateCropCanvas();
  }

  onRotationChange(val: number) {
    this.rotation = val;
    this.updateCropCanvas();
  }

  // Interactive Dragging on Crop Canvas
  startDrag(e: MouseEvent | TouchEvent) {
    this.isDragging = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    this.dragStartX = clientX - this.panX;
    this.dragStartY = clientY - this.panY;
  }

  onDrag(e: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    this.panX = Math.max(-180, Math.min(180, clientX - this.dragStartX));
    this.panY = Math.max(-180, Math.min(180, clientY - this.dragStartY));
    this.updateCropCanvas();
  }

  stopDrag() {
    this.isDragging = false;
  }

  updateCropCanvas() {
    if (!this.loadedImage || !this.cropCanvasRef) return;
    const canvas = this.cropCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Center translation
    ctx.translate(width / 2 + this.panX, height / 2 + this.panY);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.scale(this.zoom, this.zoom);

    // Draw source image centered
    const imgWidth = width;
    const imgHeight = (this.loadedImage.height / this.loadedImage.width) * width;
    ctx.drawImage(this.loadedImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    ctx.restore();

    // Draw overlay mask with oval cutout
    this.drawCropOverlay(ctx, width, height);

    // Also update circle thumbnail preview
    this.updateThumbnailPreview();
  }

  drawCropOverlay(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);

    // Cutout oval guide
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = 110;
    const radiusY = 140;
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI, true);
    ctx.fill();

    // Draw luminous border around oval
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();

    // Grid crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX - 30, centerY);
    ctx.lineTo(centerX + 30, centerY);
    ctx.moveTo(centerX, centerY - 30);
    ctx.lineTo(centerX, centerY + 30);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  updateThumbnailPreview() {
    if (!this.loadedImage || !this.previewCanvasRef) return;
    const canvas = this.previewCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    ctx.save();

    // Create circular clip
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    // Transform and draw
    ctx.translate(size / 2 + (this.panX * (size / 400)), size / 2 + (this.panY * (size / 400)));
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.scale(this.zoom, this.zoom);

    const imgWidth = size * 1.5;
    const imgHeight = (this.loadedImage.height / this.loadedImage.width) * imgWidth;
    ctx.drawImage(this.loadedImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);

    ctx.restore();
  }

  getExportedBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.loadedImage) {
        reject(new Error('No image loaded'));
        return;
      }

      // Generate high-resolution 500x500 cropped square for ArcFace
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 500;
      exportCanvas.height = 500;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context error'));
        return;
      }

      const size = 500;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);

      ctx.save();
      const scaleFactor = size / 400; // ratio against viewport
      ctx.translate(size / 2 + (this.panX * scaleFactor), size / 2 + (this.panY * scaleFactor));
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.scale(this.zoom * scaleFactor, this.zoom * scaleFactor);

      const baseWidth = 400;
      const imgHeight = (this.loadedImage.height / this.loadedImage.width) * baseWidth;
      ctx.drawImage(this.loadedImage, -baseWidth / 2, -imgHeight / 2, baseWidth, imgHeight);
      ctx.restore();

      exportCanvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate image blob'));
      }, 'image/jpeg', 0.95);
    });
  }

  handleCameraError(error: any) {
    this.cameraError = error.message || 'Camera permission denied or device not found.';
    this.snackBar.open(this.cameraError || 'Camera error', 'Close', { duration: 5000 });
    this.cdr.detectChanges();
  }

  register() {
    if (!this.loadedImage || !Number.isInteger(this.studentId)) return;
    this.saving = true;
    this.cdr.detectChanges();

    this.getExportedBlob()
      .then(blob => {
        const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });
        this.ai.registerFace(this.studentId, file).subscribe({
          next: result => {
            if (!result.success) {
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

