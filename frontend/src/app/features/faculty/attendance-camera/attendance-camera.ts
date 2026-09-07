import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebcamImage, WebcamModule } from 'ngx-webcam';
import { Subject } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AiService } from '../../../services/ai';
import { Attendance } from '../../../core/services/attendance';

@Component({
  selector: 'app-attendance-camera', standalone: true,
  imports: [CommonModule, WebcamModule, MatButtonModule, MatCardModule, MatSnackBarModule, MatProgressSpinnerModule],
  templateUrl: './attendance-camera.html', styleUrl: './attendance-camera.scss'
})
export class AttendanceCameraComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) subjectId = 0;
  @Input() date = '';
  @Output() stop = new EventEmitter<void>();
  @Output() studentMarked = new EventEmitter<number>();

  private ai = inject(AiService);
  private attendance = inject(Attendance);
  private snackBar = inject(MatSnackBar);
  private scanTimer: ReturnType<typeof setInterval> | undefined;
  private markedStudentIds = new Set<number>();

  trigger = new Subject<void>();
  processing = false;
  status = 'Starting camera…';
  recognizedCount = 0;

  get triggerObservable() { return this.trigger.asObservable(); }

  ngOnChanges(changes: SimpleChanges) {
    // Reset session state when subject or date changes
    if (changes['subjectId'] || changes['date']) {
      this.markedStudentIds.clear();
      this.recognizedCount = 0;
      this.processing = false;
      this.status = 'Scanning for faces…';
    }
  }

  ngOnInit() {
    this.status = 'Scanning for faces…';
    this.markedStudentIds.clear();
    this.recognizedCount = 0;
    // Fast scan: capture every 1.2 seconds for responsive recognition
    this.scanTimer = setInterval(() => this.captureFrame(), 1200);
  }

  handleImage(image: WebcamImage) {
    if (!this.subjectId || this.processing) return;
    this.processing = true;

    // Compress image via canvas for much faster upload + AI processing
    this.compressAndSend(image.imageAsDataUrl);
  }

  private compressAndSend(dataUrl: string) {
    const img = new Image();
    img.onload = () => {
      const MAX = 320; // small image = fast upload + fast AI processing
      let w = img.width, h = img.height;
      if (Math.max(w, h) > MAX) {
        const scale = MAX / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        if (!blob) { this.finishFrame('Unable to capture camera frame. Retrying…'); return; }
        const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });
        this.ai.recognize(file).subscribe({
          next: recognition => this.handleRecognition(recognition),
          error: () => this.finishFrame('Recognition service unavailable. Retrying…')
        });
      }, 'image/jpeg', 0.65); // 65% quality — sufficient for face recognition, faster transfer
    };
    img.onerror = () => this.finishFrame('Unable to capture camera frame. Retrying…');
    img.src = dataUrl;
  }

  captureFrame() {
    if (!this.processing) this.trigger.next();
  }

  stopAttendance() {
    this.clearScanner();
    this.stop.emit();
  }

  handleCameraError(error: any) {
    this.status = 'Camera error: ' + (error.message || 'Webcam not found or permission denied');
    this.clearScanner();
  }

  ngOnDestroy() { this.clearScanner(); }

  private handleRecognition(recognition: { recognized: boolean; studentId?: string; studentIds?: string[]; message?: string }) {
    if (!recognition.recognized) {
      this.finishFrame(recognition.message || 'Scanning for faces…');
      return;
    }

    let idsToMark: number[] = [];
    if (recognition.studentIds && recognition.studentIds.length > 0) {
      idsToMark = recognition.studentIds.map(id => Number(id)).filter(id => Number.isInteger(id));
    } else if (recognition.studentId) {
      const singleId = Number(recognition.studentId);
      if (Number.isInteger(singleId)) {
        idsToMark = [singleId];
      }
    }

    const newIds = idsToMark.filter(id => !this.markedStudentIds.has(id));

    if (newIds.length === 0) {
      this.finishFrame(this.recognizedCount > 0
        ? `${this.recognizedCount} student(s) marked. Scanning for more…`
        : 'Already marked. Scanning for new faces…');
      return;
    }

    this.status = `Recognized ${newIds.length} student(s). Marking attendance…`;
    let completedCount = 0;
    let successCount = 0;

    newIds.forEach(studentId => {
      this.attendance.markPresent(studentId, this.subjectId, this.date).subscribe({
        next: result => {
          if (result.success) {
            this.markedStudentIds.add(studentId);
            this.recognizedCount++;
            this.studentMarked.emit(studentId);
            successCount++;
          }
          completedCount++;
          if (completedCount === newIds.length) {
            this.showSummaryAndFinish(successCount);
          }
        },
        error: () => {
          completedCount++;
          if (completedCount === newIds.length) {
            this.showSummaryAndFinish(successCount);
          }
        }
      });
    });
  }

  private showSummaryAndFinish(successCount: number) {
    if (successCount > 0) {
      this.snackBar.open(`✅ Attendance marked for ${successCount} student(s)`, 'Close', { duration: 3000 });
      this.finishFrame(`✅ ${this.recognizedCount} student(s) marked total. Scanning…`);
    } else {
      this.finishFrame('No new attendance marked. Continuing scan…');
    }
  }

  private finishFrame(status: string) {
    this.status = status;
    this.processing = false;
  }

  private clearScanner() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = undefined;
    }
  }
}
