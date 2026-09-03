import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
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
export class AttendanceCameraComponent implements OnInit, OnDestroy {
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

  get triggerObservable() { return this.trigger.asObservable(); }

  ngOnInit() {
    this.status = 'Scanning for faces…';
    this.scanTimer = setInterval(() => this.captureFrame(), 2000);
  }

  handleImage(image: WebcamImage) {
    if (!this.subjectId || this.processing) return;
    this.processing = true;

    fetch(image.imageAsDataUrl)
      .then(response => response.blob())
      .then(blob => this.ai.recognize(new File([blob], 'attendance-face.jpg', { type: 'image/jpeg' })).subscribe({
        next: recognition => this.handleRecognition(recognition),
        error: () => this.finishFrame('Recognition service unavailable. Retrying…')
      }))
      .catch(() => this.finishFrame('Unable to capture camera frame. Retrying…'));
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
      this.finishFrame('Scanning for faces…');
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
      this.snackBar.open(`Attendance marked for ${successCount} student(s)`, 'Close', { duration: 3000 });
      this.finishFrame('Attendance marked. Continuing scan…');
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
