import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { Banner } from '../../../core/models/models';
import { BannerService } from '../../../core/services/banner.service';

/**
 * Dialog thêm/sửa banner. Ảnh nhập qua URL (đơn giản, không cần backend upload).
 * Trả về object banner đã lưu khi đóng, hoặc undefined nếu hủy.
 */
@Component({
  selector: 'app-banner-form-dialog',
  imports: [
    FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data._id ? 'Sửa banner' : 'Thêm banner' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Tiêu đề</mat-label>
        <input matInput [(ngModel)]="model.title" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>URL ảnh</mat-label>
        <input matInput [(ngModel)]="model.image_url" placeholder="https://..." />
      </mat-form-field>

      @if (model.image_url) {
        <img class="preview" [src]="model.image_url" alt="preview" />
      }

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Loại đích</mat-label>
          <mat-select [(ngModel)]="model.target_type">
            <mat-option value="url">Đường dẫn (URL)</mat-option>
            <mat-option value="category">Danh mục</mat-option>
            <mat-option value="product">Sản phẩm</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Thứ tự hiển thị</mat-label>
          <input matInput type="number" [(ngModel)]="model.sort_order" />
        </mat-form-field>
      </div>

      @if (model.target_type === 'url') {
        <mat-form-field appearance="outline" class="full">
          <mat-label>Đường dẫn đích</mat-label>
          <input matInput [(ngModel)]="model.target_url" placeholder="/sale" />
        </mat-form-field>
      } @else {
        <mat-form-field appearance="outline" class="full">
          <mat-label>ID đích ({{ model.target_type }})</mat-label>
          <input matInput [(ngModel)]="model.target_id" />
        </mat-form-field>
      }

      <mat-checkbox [(ngModel)]="model.is_active">Đang hiển thị</mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="ref.close()">Hủy</button>
      <button mat-flat-button color="primary" (click)="save()"
        [disabled]="!model.title || !model.image_url || saving()">Lưu</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full { width: 100%; }
    .row { display: flex; gap: 12px; }
    .row mat-form-field { flex: 1; }
    .preview { width: 100%; max-height: 160px; object-fit: cover; border-radius: 10px; margin-bottom: 12px; }
    mat-checkbox { display: block; margin-top: 4px; }
  `]
})
export class BannerFormDialog {
  ref = inject(MatDialogRef<BannerFormDialog>);
  data = inject<Banner>(MAT_DIALOG_DATA);
  private service = inject(BannerService);
  private snack = inject(MatSnackBar);

  saving = signal(false);
  model: Partial<Banner> = {
    title: this.data.title ?? '',
    image_url: this.data.image_url ?? '',
    target_type: this.data.target_type ?? 'url',
    target_id: this.data.target_id ?? '',
    target_url: this.data.target_url ?? '',
    sort_order: this.data.sort_order ?? 0,
    is_active: this.data.is_active ?? true
  };

  save(): void {
    this.saving.set(true);
    const req = this.data._id
      ? this.service.update(this.data._id, this.model)
      : this.service.create(this.model);
    req.subscribe({
      next: (b) => {
        this.snack.open('Đã lưu banner', 'OK', { duration: 2500 });
        this.ref.close(b);
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.error ?? 'Lưu banner thất bại', 'OK', { duration: 3000 });
      }
    });
  }
}

@Component({
  selector: 'app-banner-list',
  imports: [
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressBarModule
  ],
  template: `
    <div class="header">
      <h1>Quản lý Banner</h1>
      <button mat-flat-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon> Thêm banner
      </button>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    @if (!loading() && banners().length === 0) { <p class="empty">Chưa có banner nào.</p> }

    <div class="grid">
      @for (b of banners(); track b._id) {
        <mat-card class="banner">
          <img class="img" [src]="b.image_url" alt="{{ b.title }}" />
          <div class="body">
            <div class="title-row">
              <span class="title">{{ b.title }}</span>
              <mat-chip [highlighted]="b.is_active" [color]="b.is_active ? 'primary' : 'warn'">
                {{ b.is_active ? 'Hiển thị' : 'Đã ẩn' }}
              </mat-chip>
            </div>
            <div class="meta">Thứ tự: {{ b.sort_order }} · Đích: {{ b.target_url || b.target_id || '—' }}</div>
            <div class="actions">
              <button mat-icon-button (click)="openForm(b)" title="Sửa"><mat-icon>edit</mat-icon></button>
              @if (b.is_active) {
                <button mat-icon-button color="warn" (click)="remove(b)" title="Ẩn"><mat-icon>delete</mat-icon></button>
              }
            </div>
          </div>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 12px; }
    .banner { overflow: hidden; padding: 0; }
    .img { width: 100%; height: 140px; object-fit: cover; }
    .body { padding: 12px 14px; }
    .title-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .title { font-weight: 600; color: var(--brand-text-primary); }
    .meta { font-size: 12px; color: var(--brand-text-secondary); margin: 6px 0; }
    .actions { display: flex; justify-content: flex-end; }
    .empty { text-align: center; color: #777; padding: 24px; }
  `]
})
export class BannerList implements OnInit {
  private service = inject(BannerService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  banners = signal<Banner[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (res) => { this.banners.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openForm(banner?: Banner): void {
    const ref = this.dialog.open(BannerFormDialog, {
      width: '480px',
      data: banner ? { ...banner } : {}
    });
    ref.afterClosed().subscribe((saved?: Banner) => { if (saved) this.load(); });
  }

  remove(b: Banner): void {
    this.service.remove(b._id).subscribe(() => {
      this.snack.open('Đã ẩn banner', 'OK', { duration: 2500 });
      this.load();
    });
  }
}
