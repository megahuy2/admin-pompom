import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MockContentService, MockQuickLink } from '../../../core/services/mock-content.service';

// MOCK - chưa kết nối backend thật, chỉ demo UI. Thao tác không persist (refresh sẽ mất).
@Component({
  selector: 'app-quick-links',
  imports: [
    FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatFormFieldModule, MatInputModule
  ],
  template: `
    <h1>Quản lý Quick Links</h1>
    <p class="mock-note"><mat-icon>info</mat-icon> Dữ liệu mẫu (mock) — thao tác chỉ lưu tạm, refresh trang sẽ mất.</p>

    <mat-card class="form-card">
      <mat-card-content class="form">
        <mat-form-field appearance="outline">
          <mat-label>Tên</mat-label>
          <input matInput [(ngModel)]="form.name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Icon (Material)</mat-label>
          <input matInput [(ngModel)]="form.icon" placeholder="local_offer" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Đường dẫn</mat-label>
          <input matInput [(ngModel)]="form.path" placeholder="/sale" />
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
      <ng-container matColumnDef="icon">
        <th mat-header-cell *matHeaderCellDef>Icon</th>
        <td mat-cell *matCellDef="let q"><mat-icon>{{ q.icon }}</mat-icon></td>
      </ng-container>
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Tên</th>
        <td mat-cell *matCellDef="let q">{{ q.name }}</td>
      </ng-container>
      <ng-container matColumnDef="path">
        <th mat-header-cell *matHeaderCellDef>Đường dẫn</th>
        <td mat-cell *matCellDef="let q">{{ q.path }}</td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let q">
          <button mat-icon-button (click)="edit(q)" title="Sửa"><mat-icon>edit</mat-icon></button>
          <button mat-icon-button color="warn" (click)="remove(q)" title="Xóa"><mat-icon>delete</mat-icon></button>
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
export class QuickLinks implements OnInit {
  private service = inject(MockContentService);
  private snack = inject(MatSnackBar);

  items = signal<MockQuickLink[]>([]);
  editingId = signal<string | null>(null);
  form: { name: string; icon: string; path: string } = { name: '', icon: '', path: '' };
  cols = ['icon', 'name', 'path', 'actions'];

  ngOnInit(): void {
    this.service.getQuickLinks().subscribe((list) => this.items.set(list));
  }

  submit(): void {
    if (this.editingId()) {
      this.service.updateQuickLink({ id: this.editingId()!, ...this.form });
      this.snack.open('Đã cập nhật (mock)', 'OK', { duration: 2000 });
    } else {
      this.service.addQuickLink({ ...this.form });
      this.snack.open('Đã thêm (mock)', 'OK', { duration: 2000 });
    }
    this.cancel();
  }

  edit(q: MockQuickLink): void {
    this.editingId.set(q.id);
    this.form = { name: q.name, icon: q.icon, path: q.path };
  }

  remove(q: MockQuickLink): void {
    this.service.deleteQuickLink(q.id);
    this.snack.open('Đã xóa (mock)', 'OK', { duration: 2000 });
  }

  cancel(): void {
    this.editingId.set(null);
    this.form = { name: '', icon: '', path: '' };
  }
}
