import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WebsiteService, WebCollection } from '../../../core/services/website.service';

@Component({
  selector: 'app-collections',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  template: `
    <div class="page-head"><div><h1>Bộ sưu tập</h1><p class="sub">{{ items().length }} bộ sưu tập trang chủ</p></div></div>

    <div class="grid-wrap">
      <section class="card form-card">
        <h3>{{ editingId() ? 'Sửa bộ sưu tập' : 'Thêm bộ sưu tập' }}</h3>
        <label class="fld">Tên bộ sưu tập *<input [(ngModel)]="form.name" placeholder="VD: Bộ sưu tập Mùa hè" /></label>
        <label class="fld">URL ảnh<input [(ngModel)]="form.image_url" placeholder="https://…" /></label>
        <label class="fld">Thứ tự<input type="number" [(ngModel)]="form.sort_order" /></label>
        <div class="form-actions">
          <button mat-flat-button class="primary" (click)="submit()" [disabled]="saving() || !form.name.trim()">
            <mat-icon>{{ editingId() ? 'save' : 'add' }}</mat-icon> {{ editingId() ? 'Lưu' : 'Thêm' }}
          </button>
          @if (editingId()) { <button mat-stroked-button (click)="cancel()">Huỷ</button> }
        </div>
      </section>

      <div class="items">
        @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
        <div class="grid">
          @for (c of items(); track c._id) {
            <div class="item" [class.editing]="editingId() === c._id">
              @if (c.image_url) { <img class="img" [src]="c.image_url" alt="" /> }
              @else { <div class="img ph"><mat-icon>collections</mat-icon></div> }
              <div class="body">
                <span class="name">{{ c.name }}</span>
                <span class="meta">{{ c.product_ids.length }} sản phẩm · thứ tự {{ c.sort_order || 0 }}</span>
                <div class="actions">
                  <button mat-icon-button (click)="edit(c)" matTooltip="Sửa"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button (click)="remove(c)" matTooltip="Xoá"><mat-icon>delete</mat-icon></button>
                </div>
              </div>
            </div>
          }
        </div>
        @if (!loading() && items().length === 0) { <div class="empty"><mat-icon>collections</mat-icon><p>Chưa có bộ sưu tập.</p></div> }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { margin: 0; } .sub { margin: 2px 0 14px; color: var(--brand-text-secondary); font-size: 13px; }
    .grid-wrap { display: grid; grid-template-columns: 300px 1fr; gap: 16px; align-items: start; }
    @media (max-width: 860px) { .grid-wrap { grid-template-columns: 1fr; } }
    .card { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; padding: 18px; }
    .form-card h3 { margin: 0 0 14px; font-size: 16px; }
    .fld { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 600; color: var(--brand-text-secondary); margin-bottom: 12px; }
    .fld input { border: 1px solid var(--mat-sys-outline-variant); border-radius: 9px; padding: 9px 11px; font-size: 14px; font-family: inherit; color: var(--brand-text-primary); }
    .form-actions { display: flex; gap: 8px; } .primary { background: var(--brand-pink); color: #fff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
    .item { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; overflow: hidden; transition: box-shadow .15s; }
    .item:hover { box-shadow: 0 8px 20px rgba(0,0,0,.08); } .item.editing { border-color: var(--brand-pink); box-shadow: 0 0 0 2px var(--brand-pink-light); }
    .img { width: 100%; height: 130px; object-fit: cover; display: block; }
    .img.ph { display: flex; align-items: center; justify-content: center; background: var(--brand-pink-light); color: var(--brand-pink); }
    .body { padding: 12px 14px; } .name { font-weight: 600; color: var(--brand-text-primary); display: block; }
    .meta { font-size: 12px; color: var(--brand-text-secondary); } .actions { display: flex; justify-content: flex-end; margin-top: 4px; }
    .empty { text-align: center; padding: 40px; color: var(--brand-text-secondary); } .empty mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: .4; }
  `]
})
export class Collections implements OnInit {
  private service = inject(WebsiteService);
  private snack = inject(MatSnackBar);

  items = signal<WebCollection[]>([]);
  loading = signal(false);
  saving = signal(false);
  editingId = signal<string | null>(null);
  form: { name: string; image_url: string; sort_order: number } = { name: '', image_url: '', sort_order: 0 };

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    this.service.listCollections().subscribe({
      next: (res) => { this.items.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
  submit(): void {
    if (!this.form.name.trim()) return;
    this.saving.set(true);
    const id = this.editingId();
    const op = id ? this.service.updateCollection(id, this.form) : this.service.createCollection(this.form);
    op.subscribe({
      next: () => { this.saving.set(false); this.snack.open(id ? 'Đã cập nhật' : 'Đã thêm', 'OK', { duration: 2000 }); this.cancel(); this.load(); },
      error: (err) => { this.saving.set(false); this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 }); }
    });
  }
  edit(c: WebCollection): void { this.editingId.set(c._id); this.form = { name: c.name, image_url: c.image_url || '', sort_order: c.sort_order || 0 }; }
  remove(c: WebCollection): void {
    if (!confirm(`Xoá "${c.name}"?`)) return;
    this.service.deleteCollection(c._id).subscribe(() => { this.snack.open('Đã xoá', 'OK', { duration: 2000 }); this.load(); });
  }
  cancel(): void { this.editingId.set(null); this.form = { name: '', image_url: '', sort_order: 0 }; }
}
