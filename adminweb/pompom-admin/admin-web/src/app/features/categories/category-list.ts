import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Category } from '../../core/models/models';
import { CategoryService } from '../../core/services/category.service';

@Component({
  selector: 'app-category-list',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Danh mục</h1>
        <p class="sub">{{ categories().length }} danh mục</p>
      </div>
    </div>

    <div class="grid">
      <!-- Form thêm/sửa -->
      <section class="card form-card">
        <h3>{{ editing() ? 'Sửa danh mục' : 'Thêm danh mục' }}</h3>
        <label class="fld">Tên danh mục *
          <input [(ngModel)]="form.category_name" placeholder="VD: Son môi" />
        </label>
        <label class="fld">Danh mục cha
          <select [(ngModel)]="form.parent_id">
            <option [ngValue]="null">— Không —</option>
            @for (c of categories(); track c._id) {
              @if (c._id !== editing()) { <option [ngValue]="c._id">{{ c.category_name }}</option> }
            }
          </select>
        </label>
        <label class="fld">Thứ tự hiển thị
          <input type="number" [(ngModel)]="form.sort_order" />
        </label>
        <label class="fld">Ảnh (URL)
          <input [(ngModel)]="form.image_url" placeholder="https://…" />
        </label>
        <div class="form-actions">
          <button mat-flat-button class="primary" (click)="save()" [disabled]="saving() || !form.category_name.trim()">
            <mat-icon>{{ editing() ? 'save' : 'add' }}</mat-icon> {{ editing() ? 'Lưu' : 'Thêm' }}
          </button>
          @if (editing()) { <button mat-stroked-button (click)="resetForm()">Huỷ</button> }
        </div>
      </section>

      <!-- Bảng danh mục -->
      <section class="card">
        @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
        <table class="tbl">
          <thead>
            <tr><th>Danh mục</th><th>Danh mục cha</th><th class="num">Sản phẩm</th><th class="num">Thứ tự</th><th></th></tr>
          </thead>
          <tbody>
            @for (c of categories(); track c._id) {
              <tr [class.editing]="editing() === c._id">
                <td class="name-cell">
                  @if (c.image_url) { <img class="thumb" [src]="c.image_url" alt="" /> }
                  @else { <div class="thumb placeholder"><mat-icon>category</mat-icon></div> }
                  <b>{{ c.category_name }}</b>
                </td>
                <td class="muted">{{ parentName(c) }}</td>
                <td class="num"><span class="count">{{ c.product_count || 0 }}</span></td>
                <td class="num muted">{{ c.sort_order || 0 }}</td>
                <td class="actions">
                  <button mat-icon-button (click)="edit(c)" matTooltip="Sửa"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button (click)="remove(c)" matTooltip="Xoá"><mat-icon>delete</mat-icon></button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (!loading() && categories().length === 0) {
          <div class="empty"><mat-icon>category</mat-icon><p>Chưa có danh mục nào.</p></div>
        }
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { margin: 0; } .sub { margin: 2px 0 14px; color: var(--brand-text-secondary); font-size: 13px; }
    .grid { display: grid; grid-template-columns: 320px 1fr; gap: 16px; align-items: start; }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
    .card { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; padding: 18px; }
    .form-card h3 { margin: 0 0 14px; font-size: 16px; }
    .fld { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 600; color: var(--brand-text-secondary); margin-bottom: 12px; }
    .fld input, .fld select { border: 1px solid var(--mat-sys-outline-variant); border-radius: 9px; padding: 9px 11px; font-size: 14px; font-family: inherit; color: var(--brand-text-primary); }
    .form-actions { display: flex; gap: 8px; margin-top: 4px; }
    .primary { background: var(--brand-pink); color: #fff; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
    .tbl thead th { text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--brand-text-secondary); padding: 10px 12px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .tbl tbody td { padding: 9px 12px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .tbl tbody tr:last-child td { border-bottom: none; }
    .tbl tbody tr:hover { background: var(--mat-sys-surface-variant); }
    .tbl tbody tr.editing { background: var(--brand-pink-light); }
    .num { text-align: right; } .muted { color: var(--brand-text-secondary); }
    .name-cell { display: flex; align-items: center; gap: 10px; }
    .thumb { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; }
    .thumb.placeholder { display: flex; align-items: center; justify-content: center; background: var(--brand-pink-light); color: var(--brand-pink); }
    .count { background: var(--brand-lavender-light); color: #7a4f63; font-weight: 700; padding: 2px 10px; border-radius: 999px; font-size: 13px; }
    .actions { white-space: nowrap; text-align: right; }
    .empty { text-align: center; padding: 40px; color: var(--brand-text-secondary); }
    .empty mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: .4; }
  `]
})
export class CategoryList implements OnInit {
  private service = inject(CategoryService);
  private snack = inject(MatSnackBar);

  categories = signal<Category[]>([]);
  loading = signal(false);
  saving = signal(false);
  editing = signal<string | null>(null);

  form: { category_name: string; parent_id: string | null; sort_order: number; image_url: string } = {
    category_name: '', parent_id: null, sort_order: 0, image_url: ''
  };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.list(true).subscribe({
      next: (res) => { this.categories.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  resetForm(): void {
    this.editing.set(null);
    this.form = { category_name: '', parent_id: null, sort_order: 0, image_url: '' };
  }

  edit(c: Category): void {
    this.editing.set(c._id);
    this.form = {
      category_name: c.category_name,
      parent_id: typeof c.parent_id === 'object' && c.parent_id ? c.parent_id._id : (c.parent_id as string) || null,
      sort_order: c.sort_order || 0,
      image_url: c.image_url || ''
    };
  }

  save(): void {
    if (!this.form.category_name.trim()) return;
    this.saving.set(true);
    const id = this.editing();
    const op = id ? this.service.update(id, this.form) : this.service.create(this.form);
    op.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(id ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục', 'OK', { duration: 2500 });
        this.resetForm();
        this.load();
      },
      error: (err) => { this.saving.set(false); this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 }); }
    });
  }

  remove(c: Category): void {
    if (!confirm(`Xoá danh mục "${c.category_name}"?`)) return;
    this.service.remove(c._id).subscribe({
      next: () => { this.snack.open('Đã xoá danh mục', 'OK', { duration: 2500 }); this.load(); },
      error: (err) => this.snack.open(err?.error?.message ?? 'Không thể xoá', 'Đóng', { duration: 3500 })
    });
  }

  parentName(c: Category): string {
    if (c.parent_id && typeof c.parent_id === 'object') return c.parent_id.category_name;
    if (typeof c.parent_id === 'string') {
      return this.categories().find((x) => x._id === c.parent_id)?.category_name ?? '—';
    }
    return '—';
  }
}
