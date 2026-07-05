import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WebsiteService, HomeSection } from '../../../core/services/website.service';

const TYPE_LABELS: Record<string, string> = {
  banner: 'Banner', products: 'Sản phẩm', collections: 'Bộ sưu tập', community: 'Cộng đồng'
};
const TYPE_ICONS: Record<string, string> = {
  banner: 'view_carousel', products: 'inventory_2', collections: 'collections_bookmark', community: 'forum'
};

@Component({
  selector: 'app-sections',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  template: `
    <div class="page-head"><div><h1>Website · Bố cục trang chủ</h1><p class="sub">{{ items().length }} khối nội dung (sắp theo thứ tự)</p></div></div>

    <div class="grid-wrap">
      <section class="card form-card">
        <h3>{{ editingId() ? 'Sửa khối' : 'Thêm khối' }}</h3>
        <label class="fld">Tên khối *<input [(ngModel)]="form.name" placeholder="VD: Sản phẩm nổi bật" /></label>
        <label class="fld">Loại nội dung
          <select [(ngModel)]="form.content_type">
            <option value="banner">Banner</option><option value="products">Sản phẩm</option>
            <option value="collections">Bộ sưu tập</option><option value="community">Cộng đồng</option>
          </select>
        </label>
        <label class="fld">Thứ tự<input type="number" [(ngModel)]="form.sort_order" /></label>
        <div class="form-actions">
          <button mat-flat-button class="primary" (click)="submit()" [disabled]="saving() || !form.name.trim()">
            <mat-icon>{{ editingId() ? 'save' : 'add' }}</mat-icon> {{ editingId() ? 'Lưu' : 'Thêm' }}
          </button>
          @if (editingId()) { <button mat-stroked-button (click)="cancel()">Huỷ</button> }
        </div>
      </section>

      <section class="card">
        @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
        <div class="sections">
          @for (s of items(); track s._id) {
            <div class="srow" [class.editing]="editingId() === s._id">
              <span class="order">{{ s.sort_order || 0 }}</span>
              <div class="sic"><mat-icon>{{ typeIcon(s.content_type) }}</mat-icon></div>
              <div class="sinfo"><b>{{ s.name }}</b><span class="type">{{ typeLabel(s.content_type) }}</span></div>
              <div class="actions">
                <button mat-icon-button (click)="edit(s)" matTooltip="Sửa"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button (click)="remove(s)" matTooltip="Xoá"><mat-icon>delete</mat-icon></button>
              </div>
            </div>
          }
        </div>
        @if (!loading() && items().length === 0) { <div class="empty"><mat-icon>dashboard_customize</mat-icon><p>Chưa có khối nội dung.</p></div> }
      </section>
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
    .fld input, .fld select { border: 1px solid var(--mat-sys-outline-variant); border-radius: 9px; padding: 9px 11px; font-size: 14px; font-family: inherit; color: var(--brand-text-primary); }
    .form-actions { display: flex; gap: 8px; } .primary { background: var(--brand-pink); color: #fff; }
    .sections { display: flex; flex-direction: column; gap: 10px; }
    .srow { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; transition: box-shadow .15s; }
    .srow:hover { box-shadow: 0 6px 16px rgba(0,0,0,.06); } .srow.editing { border-color: var(--brand-pink); box-shadow: 0 0 0 2px var(--brand-pink-light); }
    .order { width: 28px; height: 28px; border-radius: 50%; background: var(--brand-pink-light); color: var(--brand-pink); font-weight: 700; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
    .sic { width: 40px; height: 40px; border-radius: 10px; background: var(--brand-lavender-light); color: #7a4f63; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
    .sinfo { flex: 1; } .sinfo b { display: block; color: var(--brand-text-primary); } .type { font-size: 12px; color: var(--brand-text-secondary); }
    .actions { white-space: nowrap; }
    .empty { text-align: center; padding: 40px; color: var(--brand-text-secondary); } .empty mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: .4; }
  `]
})
export class Sections implements OnInit {
  private service = inject(WebsiteService);
  private snack = inject(MatSnackBar);

  items = signal<HomeSection[]>([]);
  loading = signal(false);
  saving = signal(false);
  editingId = signal<string | null>(null);
  form: { name: string; content_type: HomeSection['content_type']; sort_order: number } = { name: '', content_type: 'products', sort_order: 0 };

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    this.service.listSections().subscribe({
      next: (res) => { this.items.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
  submit(): void {
    if (!this.form.name.trim()) return;
    this.saving.set(true);
    const id = this.editingId();
    const op = id ? this.service.updateSection(id, this.form) : this.service.createSection(this.form);
    op.subscribe({
      next: () => { this.saving.set(false); this.snack.open(id ? 'Đã cập nhật' : 'Đã thêm', 'OK', { duration: 2000 }); this.cancel(); this.load(); },
      error: (err) => { this.saving.set(false); this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 }); }
    });
  }
  edit(s: HomeSection): void { this.editingId.set(s._id); this.form = { name: s.name, content_type: s.content_type, sort_order: s.sort_order || 0 }; }
  remove(s: HomeSection): void {
    if (!confirm(`Xoá "${s.name}"?`)) return;
    this.service.deleteSection(s._id).subscribe(() => { this.snack.open('Đã xoá', 'OK', { duration: 2000 }); this.load(); });
  }
  cancel(): void { this.editingId.set(null); this.form = { name: '', content_type: 'products', sort_order: 0 }; }

  typeLabel(t: string): string { return TYPE_LABELS[t] ?? t; }
  typeIcon(t: string): string { return TYPE_ICONS[t] ?? 'widgets'; }
}
