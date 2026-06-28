import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MockContentService, MockSection } from '../../../core/services/mock-content.service';

// MOCK - chưa kết nối backend thật, chỉ demo UI. Thao tác không persist (refresh sẽ mất).
@Component({
  selector: 'app-sections',
  imports: [
    FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule
  ],
  template: `
    <h1>Quản lý Section Home</h1>
    <p class="mock-note"><mat-icon>info</mat-icon> Dữ liệu mẫu (mock) — thao tác chỉ lưu tạm, refresh trang sẽ mất.</p>

    <mat-card class="form-card">
      <mat-card-content class="form">
        <mat-form-field appearance="outline">
          <mat-label>Tên section</mat-label>
          <input matInput [(ngModel)]="form.name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Thứ tự</mat-label>
          <input matInput type="number" [(ngModel)]="form.order" min="1" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Loại nội dung</mat-label>
          <mat-select [(ngModel)]="form.contentType">
            <mat-option value="banner">Banner</mat-option>
            <mat-option value="products">Sản phẩm</mat-option>
            <mat-option value="collections">Bộ sưu tập</mat-option>
            <mat-option value="community">Cộng đồng</mat-option>
          </mat-select>
        </mat-form-field>
        <div class="form-actions">
          @if (editingId()) { <button mat-stroked-button (click)="cancel()">Hủy</button> }
          <button mat-flat-button color="primary" (click)="submit()" [disabled]="!form.name">
            {{ editingId() ? 'Cập nhật' : 'Thêm' }}
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    <table mat-table [dataSource]="items()" class="mat-elevation-z1 table">
      <ng-container matColumnDef="order">
        <th mat-header-cell *matHeaderCellDef>Thứ tự</th>
        <td mat-cell *matCellDef="let s">{{ s.order }}</td>
      </ng-container>
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Tên section</th>
        <td mat-cell *matCellDef="let s">{{ s.name }}</td>
      </ng-container>
      <ng-container matColumnDef="contentType">
        <th mat-header-cell *matHeaderCellDef>Loại nội dung</th>
        <td mat-cell *matCellDef="let s">{{ typeLabel(s.contentType) }}</td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let s">
          <button mat-icon-button (click)="edit(s)" title="Sửa"><mat-icon>edit</mat-icon></button>
          <button mat-icon-button color="warn" (click)="remove(s)" title="Xóa"><mat-icon>delete</mat-icon></button>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols;"></tr>
    </table>
  `,
  styles: [`
    .mock-note { display: flex; align-items: center; gap: 6px; color: var(--brand-gold); font-size: 13px; }
    .mock-note mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .form-card { margin-bottom: 16px; }
    .form { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .form mat-form-field { flex: 1; min-width: 160px; }
    .form-actions { display: flex; gap: 8px; }
    .table { width: 100%; }
  `]
})
export class Sections implements OnInit {
  private service = inject(MockContentService);
  private snack = inject(MatSnackBar);

  items = signal<MockSection[]>([]);
  editingId = signal<string | null>(null);
  form: { name: string; order: number; contentType: MockSection['contentType'] } =
    { name: '', order: 1, contentType: 'products' };
  cols = ['order', 'name', 'contentType', 'actions'];

  ngOnInit(): void {
    this.service.getSections().subscribe((list) => this.items.set(list));
  }

  submit(): void {
    if (this.editingId()) {
      this.service.updateSection({ id: this.editingId()!, ...this.form });
      this.snack.open('Đã cập nhật (mock)', 'OK', { duration: 2000 });
    } else {
      this.service.addSection({ ...this.form });
      this.snack.open('Đã thêm (mock)', 'OK', { duration: 2000 });
    }
    this.cancel();
  }

  edit(s: MockSection): void {
    this.editingId.set(s.id);
    this.form = { name: s.name, order: s.order, contentType: s.contentType };
  }

  remove(s: MockSection): void {
    this.service.deleteSection(s.id);
    this.snack.open('Đã xóa (mock)', 'OK', { duration: 2000 });
  }

  cancel(): void {
    this.editingId.set(null);
    this.form = { name: '', order: 1, contentType: 'products' };
  }

  typeLabel(t: string): string {
    const map: Record<string, string> = { banner: 'Banner', products: 'Sản phẩm', collections: 'Bộ sưu tập', community: 'Cộng đồng' };
    return map[t] ?? t;
  }
}
