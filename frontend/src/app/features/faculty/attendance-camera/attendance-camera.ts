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
  @Input() isProxy = false;
  @Input() proxyNotes = '';
  @Output() stop = new EventEmitter<void>();
  @Output() studentMarked = new EventEmitter<number>();

  private ai = inject(AiService);
  private attendance = inject(Attendance);
  private snackBar = inject(MatSnackBar);
  private scanTimer: ReturnType<typeof setInterval> | undefined;
  private scanTimeout: ReturnType<typeof setTimeout> | undefined;
  private markedStudentIds = new Set<number>();

  trigger = new Subject<void>();
  processing = false;
  status = 'Starting camera…';
  recognizedCount = 0;
  isScanning = true;

  get triggerObservable() { return this.trigger.asObservable(); }

  ngOnChanges(changes: SimpleChanges) {
    // Reset session state when subject or date changes
    if (changes['subjectId'] || changes['date']) {
      this.markedStudentIds.clear();
      this.recognizedCount = 0;
      this.processing = false;
      this.status = 'Scanning for faces…';
      this.isScanning = true;
    }
  }

  ngOnInit() {
    this.status = 'Scanning for faces…';
    this.markedStudentIds.clear();
    this.recognizedCount = 0;
    this.isScanning = true;
    
    // Trigger first frame right away
    setTimeout(() => this.captureFrame(), 300);

    // Safety fallback interval for continuous scanning
    this.scanTimer = setInterval(() => {
      if (!this.processing && this.isScanning) {
        this.captureFrame();
      }
    }, 500);
  }

  handleImage(image: WebcamImage) {
    if (!this.subjectId || this.processing || !this.isScanning) return;
    this.processing = true;

    try {
      // Instant direct conversion from base64 to Blob (<1ms)
      const blob = this.dataUrlToBlob(image.imageAsDataUrl);
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });
      this.ai.recognize(file).subscribe({
        next: recognition => this.handleRecognition(recognition),
        error: () => this.finishFrame('Recognition service temporarily unavailable. Retrying…')
      });
    } catch {
      this.finishFrame('Unable to process camera frame. Retrying…');
    }
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binaryStr = atob(parts[1]);
    const len = binaryStr.length;
    const u8arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      u8arr[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  }

  captureFrame() {
    if (!this.processing && this.isScanning) this.trigger.next();
  }

  toggleScanning() {
    if (this.isScanning) {
      this.clearScanner();
      this.isScanning = false;
      this.status = 'Face scanning stopped. Click Resume to continue.';
      this.snackBar.open('Face scanning stopped.', 'Close', { duration: 2000 });
    } else {
      this.isScanning = true;
      this.status = 'Scanning for faces…';
      this.captureFrame();
      this.scanTimer = setInterval(() => {
        if (!this.processing && this.isScanning) {
          this.captureFrame();
        }
      }, 500);
      this.snackBar.open('Face scanning resumed.', 'Close', { duration: 2000 });
    }
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

    // Immediately register in marked IDs to prevent duplicate triggers
    newIds.forEach(id => this.markedStudentIds.add(id));

    this.status = `Recognized ${newIds.length} student(s). Marking attendance…`;
    let completedCount = 0;
    let successCount = 0;

    newIds.forEach(studentId => {
      this.attendance.markPresent(studentId, this.subjectId, this.date, this.isProxy, this.proxyNotes).subscribe({
        next: result => {
          if (result.success) {
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
      const msg = this.isProxy 
        ? `⚡ Proxy attendance marked for ${successCount} student(s)`
        : `✅ Attendance marked for ${successCount} student(s)`;
      this.snackBar.open(msg, 'Close', { duration: 2500 });
      this.finishFrame(`✅ ${this.recognizedCount} student(s) marked total. Scanning…`);
    } else {
      this.finishFrame('No new attendance marked. Continuing scan…');
    }
  }

  private finishFrame(status: string) {
    this.status = status;
    this.processing = false;
    // Schedule next frame rapidly after only 150ms if scanning is active
    if (this.isScanning && !this.scanTimeout) {
      this.scanTimeout = setTimeout(() => {
        this.scanTimeout = undefined;
        this.captureFrame();
      }, 150);
    }
  }

  private clearScanner() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = undefined;
    }
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = undefined;
    }
  }
}
