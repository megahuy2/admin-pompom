import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MockContentService, MockCollection } from '../../../core/services/mock-content.service';

// MOCK - chưa kết nối backend thật, chỉ demo UI. Thao tác không persist (refresh sẽ mất).
@Component({
  selector: 'app-collections',
  imports: [
    FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule
  ],
  template: `
    <h1>Quản lý Collection</h1>
    <p class="mock-note"><mat-icon>info</mat-icon> Dữ liệu mẫu (mock) — thao tác chỉ lưu tạm, refresh trang sẽ mất.</p>

    <mat-card class="form-card">
      <mat-card-content class="form">
        <mat-form-field appearance="outline">
          <mat-label>Tên collection</mat-label>
          <input matInput [(ngModel)]="form.name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>URL ảnh</mat-label>
          <input matInput [(ngModel)]="form.image_url" placeholder="https://..." />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>SL sản phẩm liên kết</mat-label>
          <input matInput type="number" [(ngModel)]="productCount" min="0" />
        </mat-form-field>
        <div class="form-actions">
          @if (editingId()) {
            <button mat-stroked-button (click)="cancel()">Hủy</button>
          }
          <button mat-flat-button color="primary" (click)="submit()" [disabled]="!form.name">
            {{ editingId() ? 'Cập nhật' : 'Thêm' }}
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    <div class="grid">
      @for (c of items(); track c.id) {
        <mat-card class="item">
          <img class="img" [src]="c.image_url" alt="{{ c.name }}" />
          <div class="body">
            <span class="name">{{ c.name }}</span>
            <span class="meta">{{ c.productIds.length }} sản phẩm liên kết</span>
            <div class="actions">
              <button mat-icon-button (click)="edit(c)" title="Sửa"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button color="warn" (click)="remove(c)" title="Xóa"><mat-icon>delete</mat-icon></button>
            </div>
          </div>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .mock-note { display: flex; align-items: center; gap: 6px; color: var(--brand-gold); font-size: 13px; }
    .mock-note mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .form-card { margin-bottom: 16px; }
    .form { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .form mat-form-field { flex: 1; min-width: 180px; }
    .form-actions { display: flex; gap: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .item { overflow: hidden; padding: 0; }
    .img { width: 100%; height: 130px; object-fit: cover; }
    .body { padding: 12px 14px; display: flex; flex-direction: column; }
    .name { font-weight: 600; color: var(--brand-text-primary); }
    .meta { font-size: 12px; color: var(--brand-text-secondary); margin: 4px 0; }
    .actions { display: flex; justify-content: flex-end; }
  `]
})
export class Collections implements OnInit {
  private service = inject(MockContentService);
  private snack = inject(MatSnackBar);

  items = signal<MockCollection[]>([]);
  editingId = signal<string | null>(null);
  form: { name: string; image_url: string } = { name: '', image_url: '' };
  productCount = 0;

  ngOnInit(): void {
    this.service.getCollections().subscribe((list) => this.items.set(list));
  }

  submit(): void {
    const productIds = Array.from({ length: this.productCount }, (_, i) => `p${i + 1}`);
    if (this.editingId()) {
      this.service.updateCollection({ id: this.editingId()!, name: this.form.name, image_url: this.form.image_url, productIds });
      this.snack.open('Đã cập nhật (mock)', 'OK', { duration: 2000 });
    } else {
      this.service.addCollection({ name: this.form.name, image_url: this.form.image_url, productIds });
      this.snack.open('Đã thêm (mock)', 'OK', { duration: 2000 });
    }
    this.cancel();
  }

  edit(c: MockCollection): void {
    this.editingId.set(c.id);
    this.form = { name: c.name, image_url: c.image_url };
    this.productCount = c.productIds.length;
  }

  remove(c: MockCollection): void {
    this.service.deleteCollection(c.id);
    this.snack.open('Đã xóa (mock)', 'OK', { duration: 2000 });
  }

  cancel(): void {
    this.editingId.set(null);
    this.form = { name: '', image_url: '' };
    this.productCount = 0;
  }
}
