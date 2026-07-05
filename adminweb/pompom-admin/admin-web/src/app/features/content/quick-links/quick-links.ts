import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WebsiteService, QuickLink } from '../../../core/services/website.service';

@Component({
  selector: 'app-quick-links',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  template: `
    <div class="page-head"><div><h1>Quick Links</h1><p class="sub">{{ items().length }} liên kết nhanh</p></div></div>

    <div class="grid-wrap">
      <section class="card form-card">
        <h3>{{ editingId() ? 'Sửa liên kết' : 'Thêm liên kết' }}</h3>
        <label class="fld">Tên *<input [(ngModel)]="form.name" placeholder="VD: Khuyến mãi" /></label>
        <label class="fld">Icon (Material)<input [(ngModel)]="form.icon" placeholder="VD: local_offer" /></label>
        <label class="fld">Đường dẫn<input [(ngModel)]="form.path" placeholder="/sale" /></label>
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
        <table class="tbl">
          <thead><tr><th>Liên kết</th><th>Đường dẫn</th><th class="num">Thứ tự</th><th></th></tr></thead>
          <tbody>
            @for (q of items(); track q._id) {
              <tr [class.editing]="editingId() === q._id">
                <td class="link-cell"><div class="qic"><mat-icon>{{ q.icon || 'link' }}</mat-icon></div><b>{{ q.name }}</b></td>
                <td class="muted">{{ q.path || '—' }}</td>
                <td class="num muted">{{ q.sort_order || 0 }}</td>
                <td class="actions">
                  <button mat-icon-button (click)="edit(q)" matTooltip="Sửa"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button (click)="remove(q)" matTooltip="Xoá"><mat-icon>delete</mat-icon></button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (!loading() && items().length === 0) { <div class="empty"><mat-icon>link</mat-icon><p>Chưa có liên kết.</p></div> }
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
    .fld input { border: 1px solid var(--mat-sys-outline-variant); border-radius: 9px; padding: 9px 11px; font-size: 14px; font-family: inherit; }
    .form-actions { display: flex; gap: 8px; } .primary { background: var(--brand-pink); color: #fff; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
    .tbl thead th { text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--brand-text-secondary); padding: 10px 12px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .tbl tbody td { padding: 9px 12px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .tbl tbody tr:last-child td { border-bottom: none; } .tbl tbody tr.editing { background: var(--brand-pink-light); }
    .num { text-align: right; } .muted { color: var(--brand-text-secondary); }
    .link-cell { display: flex; align-items: center; gap: 10px; }
    .qic { width: 34px; height: 34px; border-radius: 9px; background: var(--brand-lavender-light); color: #7a4f63; display: flex; align-items: center; justify-content: center; }
    .qic mat-icon { font-size: 19px; width: 19px; height: 19px; } .actions { text-align: right; white-space: nowrap; }
    .empty { text-align: center; padding: 40px; color: var(--brand-text-secondary); } .empty mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: .4; }
  `]
})
export class QuickLinks implements OnInit {
  private service = inject(WebsiteService);
  private snack = inject(MatSnackBar);

  items = signal<QuickLink[]>([]);
  loading = signal(false);
  saving = signal(false);
  editingId = signal<string | null>(null);
  form: { name: string; icon: string; path: string; sort_order: number } = { name: '', icon: 'link', path: '', sort_order: 0 };

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    this.service.listQuickLinks().subscribe({
      next: (res) => { this.items.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
  submit(): void {
    if (!this.form.name.trim()) return;
    this.saving.set(true);
    const id = this.editingId();
    const op = id ? this.service.updateQuickLink(id, this.form) : this.service.createQuickLink(this.form);
    op.subscribe({
      next: () => { this.saving.set(false); this.snack.open(id ? 'Đã cập nhật' : 'Đã thêm', 'OK', { duration: 2000 }); this.cancel(); this.load(); },
      error: (err) => { this.saving.set(false); this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 }); }
    });
  }
  edit(q: QuickLink): void { this.editingId.set(q._id); this.form = { name: q.name, icon: q.icon || 'link', path: q.path || '', sort_order: q.sort_order || 0 }; }
  remove(q: QuickLink): void {
    if (!confirm(`Xoá "${q.name}"?`)) return;
    this.service.deleteQuickLink(q._id).subscribe(() => { this.snack.open('Đã xoá', 'OK', { duration: 2000 }); this.load(); });
  }
  cancel(): void { this.editingId.set(null); this.form = { name: '', icon: 'link', path: '', sort_order: 0 }; }
}
