import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatDialog, MatDialogModule, MatDialogRef
} from '@angular/material/dialog';
import { CommunityPost } from '../../../core/models/models';
import { CommunityService } from '../../../core/services/community.service';
import { UploadService } from '../../../core/services/upload.service';

/**
 * Dialog nhập lý do từ chối. Trả về chuỗi lý do khi bấm "Từ chối", undefined khi hủy.
 */
@Component({
  selector: 'app-reject-reason-dialog',
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Lý do từ chối</h2>
    <mat-dialog-content>
      <p>Nhập lý do từ chối bài viết (sẽ gửi kèm thông báo cho tác giả):</p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Lý do</mat-label>
        <textarea matInput rows="4" [(ngModel)]="reason"
          placeholder="VD: Nội dung vi phạm quy định cộng đồng / spam quảng cáo..."></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="ref.close()">Hủy</button>
      <button mat-flat-button color="warn" (click)="ref.close(reason || '')">Từ chối</button>
    </mat-dialog-actions>
  `,
  styles: [`.full { width: 100%; } p { color: var(--brand-text-secondary); }`]
})
export class RejectReasonDialog {
  ref = inject(MatDialogRef<RejectReasonDialog>);
  reason = '';
}

@Component({
  selector: 'app-moderation',
  imports: [
    DatePipe,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressBarModule
  ],
  template: `
    <h1>Duyệt nội dung</h1>
    <p class="hint">Danh sách bài viết đang chờ duyệt. Phê duyệt để hiển thị ra cộng đồng, hoặc từ chối (kèm lý do).</p>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    @if (!loading() && posts().length === 0) {
      <mat-card class="empty-card">
        <mat-icon>task_alt</mat-icon>
        <p>Không có bài viết nào chờ duyệt.</p>
      </mat-card>
    }

    <div class="list">
      @for (p of posts(); track p._id) {
        <mat-card class="post">
          <div class="post-head">
            <div class="author">
              @if (authorAvatar(p)) {
                <img class="avatar" [src]="authorAvatar(p)" alt="avatar" />
              } @else {
                <div class="avatar placeholder"><mat-icon>person</mat-icon></div>
              }
              <div>
                <div class="name">{{ authorName(p) }}</div>
                <div class="date">{{ p.created_at | date:'dd/MM/yyyy HH:mm' }}</div>
              </div>
            </div>
            @if (p.post_type) { <mat-chip>{{ postTypeLabel(p.post_type) }}</mat-chip> }
          </div>

          <p class="content">{{ p.content }}</p>

          @if (p.images?.length) {
            <div class="images">
              @for (img of p.images; track img) {
                <img class="post-img" [src]="upload.resolveUrl(img)" alt="ảnh bài viết" />
              }
            </div>
          }

          <div class="actions">
            <button mat-flat-button color="primary" (click)="approve(p)" [disabled]="busyId() === p._id">
              <mat-icon>check_circle</mat-icon> Phê duyệt
            </button>
            <button mat-stroked-button color="warn" (click)="openReject(p)" [disabled]="busyId() === p._id">
              <mat-icon>cancel</mat-icon> Từ chối
            </button>
          </div>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .hint { color: var(--brand-text-secondary); margin-top: 0; }
    .list { display: flex; flex-direction: column; gap: 16px; }
    .post { padding: 16px; }
    .post-head { display: flex; justify-content: space-between; align-items: flex-start; }
    .author { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
    .avatar.placeholder { display: flex; align-items: center; justify-content: center; background: var(--brand-lavender-light); color: var(--brand-lavender); }
    .name { font-weight: 600; color: var(--brand-text-primary); }
    .date { font-size: 12px; color: var(--brand-text-secondary); }
    .content { margin: 14px 0; color: var(--brand-text-primary); white-space: pre-wrap; }
    .images { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
    .post-img { width: 120px; height: 120px; border-radius: 10px; object-fit: cover; border: 1px solid var(--mat-sys-outline-variant); }
    .actions { display: flex; gap: 12px; }
    .empty-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px; color: var(--brand-text-secondary); }
    .empty-card mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--brand-lavender); }
  `]
})
export class Moderation implements OnInit {
  private service = inject(CommunityService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  upload = inject(UploadService);

  posts = signal<CommunityPost[]>([]);
  loading = signal(false);
  busyId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.pending(1, 50).subscribe({
      next: (res) => {
        this.posts.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  approve(p: CommunityPost): void {
    this.busyId.set(p._id);
    this.service.approve(p._id).subscribe({
      next: () => {
        this.snack.open('Đã phê duyệt — bài viết hiển thị & đã gửi thông báo tác giả', 'OK', { duration: 3000 });
        this.removeFromList(p._id);
      },
      error: () => { this.busyId.set(null); this.snack.open('Phê duyệt thất bại', 'OK', { duration: 2500 }); }
    });
  }

  openReject(p: CommunityPost): void {
    const ref = this.dialog.open(RejectReasonDialog, { width: '440px' });
    ref.afterClosed().subscribe((reason: string | undefined) => {
      // undefined = bấm Hủy; chuỗi (kể cả rỗng) = xác nhận từ chối
      if (reason === undefined) return;
      this.reject(p, reason);
    });
  }

  private reject(p: CommunityPost, reason: string): void {
    this.busyId.set(p._id);
    this.service.reject(p._id, reason).subscribe({
      next: () => {
        this.snack.open('Đã từ chối — đã gửi thông báo tác giả', 'OK', { duration: 3000 });
        this.removeFromList(p._id);
      },
      error: () => { this.busyId.set(null); this.snack.open('Từ chối thất bại', 'OK', { duration: 2500 }); }
    });
  }

  private removeFromList(id: string): void {
    this.posts.update((list) => list.filter((x) => x._id !== id));
    this.busyId.set(null);
  }

  authorName(p: CommunityPost): string {
    if (p.user_id && typeof p.user_id === 'object') return p.user_id.full_name;
    return '(ẩn danh)';
  }

  authorAvatar(p: CommunityPost): string | null {
    if (p.user_id && typeof p.user_id === 'object') return p.user_id.avatar_url ?? null;
    return null;
  }

  postTypeLabel(type: string): string {
    const map: Record<string, string> = { review: 'Đánh giá', makeup_tips: 'Mẹo makeup', looks: 'Phong cách' };
    return map[type] ?? type;
  }
}
