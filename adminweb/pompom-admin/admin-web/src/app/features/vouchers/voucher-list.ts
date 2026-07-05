import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Voucher } from '../../core/models/models';
import { VoucherService } from '../../core/services/voucher.service';

interface VoucherForm {
  code: string; discount_type: 'percent' | 'fixed'; discount_value: number;
  min_order_amount: number; max_discount: number; start_date: string; end_date: string;
  usage_limit: number; is_active: boolean;
}

@Component({
  selector: 'app-voucher-list',
  imports: [
    FormsModule, DatePipe, DecimalPipe,
    MatButtonModule, MatIconModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Voucher</h1>
        <p class="sub">{{ total() | number }} voucher</p>
      </div>
      <button mat-flat-button class="primary" (click)="openCreate()"><mat-icon>add</mat-icon> Thêm voucher</button>
    </div>

    <div class="chips">
      <button class="chip" [class.on]="status === ''" (click)="setStatus('')">Tất cả</button>
      <button class="chip" [class.on]="status === 'active'" (click)="setStatus('active')">Đang hiệu lực</button>
      <button class="chip" [class.on]="status === 'upcoming'" (click)="setStatus('upcoming')">Sắp diễn ra</button>
      <button class="chip" [class.on]="status === 'expired'" (click)="setStatus('expired')">Hết hạn</button>
    </div>

    <div class="toolbar">
      <div class="search">
        <mat-icon>search</mat-icon>
        <input [(ngModel)]="search" (keyup.enter)="applyFilter()" placeholder="Tìm theo mã voucher…" />
        @if (search) { <mat-icon class="clear" (click)="search=''; applyFilter()">close</mat-icon> }
      </div>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Mã voucher</th><th>Giảm giá</th><th class="num">Đơn tối thiểu</th>
            <th class="num">Lượt dùng</th><th>Hiệu lực</th><th>Trạng thái</th><th></th>
          </tr>
        </thead>
        <tbody>
          @for (v of vouchers(); track v._id) {
            <tr>
              <td><span class="code">{{ v.code }}</span></td>
              <td class="disc">
                @if (v.discount_type === 'percent') { {{ v.discount_value }}% }
                @else { {{ v.discount_value | number }} ₫ }
                @if (v.max_discount) { <span class="muted">(tối đa {{ v.max_discount | number }} ₫)</span> }
              </td>
              <td class="num">{{ (v.min_order_amount || 0) | number }} ₫</td>
              <td class="num">{{ v.used_count || 0 }}@if (v.usage_limit) { <span class="muted">/ {{ v.usage_limit }}</span> }</td>
              <td class="muted">{{ v.start_date | date:'dd/MM/yy' }} → {{ v.end_date | date:'dd/MM/yy' }}</td>
              <td><span class="badge {{ stateCls(v) }}">{{ stateLabel(v) }}</span></td>
              <td class="actions">
                <button mat-icon-button (click)="openEdit(v)" matTooltip="Sửa"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button (click)="remove(v)" matTooltip="Xoá"><mat-icon>delete</mat-icon></button>
              </td>
            </tr>
          }
        </tbody>
      </table>
      @if (!loading() && vouchers().length === 0) {
        <div class="empty"><mat-icon>confirmation_number</mat-icon><p>Chưa có voucher nào.</p></div>
      }
    </div>

    <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page() - 1"
      [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>

    <!-- Modal thêm/sửa -->
    @if (formOpen()) {
      <div class="modal" (click)="closeForm()">
        <div class="sheet" (click)="$event.stopPropagation()">
          <div class="sheet-head">
            <h2>{{ editing() ? 'Sửa voucher' : 'Thêm voucher' }}</h2>
            <button mat-icon-button (click)="closeForm()"><mat-icon>close</mat-icon></button>
          </div>
          <div class="form-grid">
            <label class="fld span2">Mã voucher *<input [(ngModel)]="form.code" placeholder="VD: SUMMER20" [disabled]="!!editing()" /></label>
            <label class="fld">Loại giảm
              <select [(ngModel)]="form.discount_type">
                <option value="percent">Phần trăm (%)</option><option value="fixed">Số tiền (₫)</option>
              </select>
            </label>
            <label class="fld">Giá trị giảm *<input type="number" min="0" [(ngModel)]="form.discount_value" /></label>
            <label class="fld">Đơn tối thiểu (₫)<input type="number" min="0" [(ngModel)]="form.min_order_amount" /></label>
            <label class="fld">Giảm tối đa (₫)<input type="number" min="0" [(ngModel)]="form.max_discount" /></label>
            <label class="fld">Ngày bắt đầu *<input type="date" [(ngModel)]="form.start_date" /></label>
            <label class="fld">Ngày kết thúc *<input type="date" [(ngModel)]="form.end_date" /></label>
            <label class="fld">Giới hạn lượt dùng (0 = không giới hạn)<input type="number" min="0" [(ngModel)]="form.usage_limit" /></label>
            <label class="fld chk"><input type="checkbox" [(ngModel)]="form.is_active" /> Đang kích hoạt</label>
          </div>
          <div class="sheet-actions">
            <button mat-stroked-button (click)="closeForm()">Huỷ</button>
            <button mat-flat-button class="primary" (click)="save()" [disabled]="saving() || !valid()">
              <mat-icon>{{ editing() ? 'save' : 'add' }}</mat-icon> {{ editing() ? 'Lưu' : 'Thêm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
    .page-head h1 { margin: 0; } .sub { margin: 2px 0 0; color: var(--brand-text-secondary); font-size: 13px; }
    .primary { background: var(--brand-pink); color: #fff; }
    .chips { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
    .chip { border: 1px solid var(--mat-sys-outline-variant); background: var(--mat-sys-surface); color: var(--brand-text-secondary);
      padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; }
    .chip:hover { border-color: var(--brand-pink); color: var(--brand-pink); }
    .chip.on { background: linear-gradient(135deg, var(--brand-pink), var(--brand-lavender)); color: #fff; border-color: transparent; }
    .toolbar { margin-bottom: 14px; }
    .search { display: flex; align-items: center; gap: 8px; background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 8px 12px; max-width: 360px; }
    .search:focus-within { border-color: var(--brand-pink); box-shadow: 0 0 0 3px var(--brand-pink-light); }
    .search input { border: none; outline: none; background: transparent; width: 100%; font-size: 14px; }
    .search mat-icon { color: var(--brand-text-secondary); font-size: 20px; } .search .clear { cursor: pointer; }

    .table-wrap { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; overflow: auto; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
    .tbl thead th { text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--brand-text-secondary); padding: 12px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); white-space: nowrap; }
    .tbl tbody td { padding: 11px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .tbl tbody tr:last-child td { border-bottom: none; } .tbl tbody tr:hover { background: var(--mat-sys-surface-variant); }
    .num { text-align: right; } .muted { color: var(--brand-text-secondary); font-size: 12px; }
    .code { font-weight: 700; font-family: monospace; background: var(--brand-pink-light); color: var(--brand-pink); padding: 3px 10px; border-radius: 8px; letter-spacing: .5px; }
    .disc { font-weight: 600; } .actions { text-align: right; white-space: nowrap; }
    .badge { font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 10px; white-space: nowrap; }
    .st-active { background: #dcefe4; color: #2f7d52; } .st-upcoming { background: #dbe7ff; color: #2f5bbd; }
    .st-expired { background: #eeeeee; color: #777; } .st-off { background: #ffdad6; color: #b3261e; }
    .empty { text-align: center; padding: 48px; color: var(--brand-text-secondary); }
    .empty mat-icon { font-size: 42px; width: 42px; height: 42px; opacity: .4; } .empty p { margin: 8px 0 0; }

    .modal { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
    .sheet { background: var(--mat-sys-surface); border-radius: 18px; width: 100%; max-width: 560px; max-height: 90vh; overflow: auto; animation: pop .2s ease; }
    @keyframes pop { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
    .sheet-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .sheet-head h2 { margin: 0; font-size: 18px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 20px; }
    .fld { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 600; color: var(--brand-text-secondary); }
    .fld.span2 { grid-column: 1 / -1; }
    .fld input, .fld select { border: 1px solid var(--mat-sys-outline-variant); border-radius: 9px; padding: 9px 11px; font-size: 14px; font-family: inherit; color: var(--brand-text-primary); }
    .fld.chk { flex-direction: row; align-items: center; gap: 8px; grid-column: 1 / -1; }
    .fld.chk input { width: 16px; height: 16px; accent-color: var(--brand-pink); }
    .sheet-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px; }
  `]
})
export class VoucherList implements OnInit {
  private service = inject(VoucherService);
  private snack = inject(MatSnackBar);

  vouchers = signal<Voucher[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  saving = signal(false);
  limit = 20;
  search = '';
  status = '';

  formOpen = signal(false);
  editing = signal<string | null>(null);
  form: VoucherForm = this.blankForm();

  ngOnInit(): void { this.load(); }

  private blankForm(): VoucherForm {
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    return { code: '', discount_type: 'percent', discount_value: 0, min_order_amount: 0, max_discount: 0, start_date: today, end_date: nextMonth, usage_limit: 0, is_active: true };
  }

  load(): void {
    this.loading.set(true);
    this.service.list({ page: this.page(), limit: this.limit, search: this.search, status: (this.status || undefined) as never })
      .subscribe({
        next: (res) => { this.vouchers.set(res.data); this.total.set(res.total); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
  }

  applyFilter(): void { this.page.set(1); this.load(); }
  setStatus(s: string): void { this.status = s; this.applyFilter(); }
  onPage(e: PageEvent): void { this.limit = e.pageSize; this.page.set(e.pageIndex + 1); this.load(); }

  openCreate(): void { this.editing.set(null); this.form = this.blankForm(); this.formOpen.set(true); }
  openEdit(v: Voucher): void {
    this.editing.set(v._id);
    this.form = {
      code: v.code, discount_type: v.discount_type, discount_value: v.discount_value,
      min_order_amount: v.min_order_amount || 0, max_discount: v.max_discount || 0,
      start_date: (v.start_date || '').slice(0, 10), end_date: (v.end_date || '').slice(0, 10),
      usage_limit: v.usage_limit || 0, is_active: v.is_active
    };
    this.formOpen.set(true);
  }
  closeForm(): void { this.formOpen.set(false); }
  valid(): boolean { return !!this.form.code.trim() && this.form.discount_value >= 0 && !!this.form.start_date && !!this.form.end_date; }

  save(): void {
    if (!this.valid()) return;
    this.saving.set(true);
    const id = this.editing();
    const op = id ? this.service.update(id, this.form) : this.service.create(this.form);
    op.subscribe({
      next: () => {
        this.saving.set(false); this.formOpen.set(false);
        this.snack.open(id ? 'Đã cập nhật voucher' : 'Đã thêm voucher', 'OK', { duration: 2500 });
        this.load();
      },
      error: (err) => { this.saving.set(false); this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3500 }); }
    });
  }

  remove(v: Voucher): void {
    if (!confirm(`Xoá voucher "${v.code}"?`)) return;
    this.service.remove(v._id).subscribe({
      next: (res) => { this.snack.open(res.message, 'OK', { duration: 3000 }); this.load(); },
      error: (err) => this.snack.open(err?.error?.message ?? 'Không thể xoá', 'Đóng', { duration: 3000 })
    });
  }

  // Trạng thái hiển thị: dựa trên is_active + ngày
  private state(v: Voucher): 'off' | 'upcoming' | 'expired' | 'active' {
    if (!v.is_active) return 'off';
    const now = Date.now();
    if (new Date(v.start_date).getTime() > now) return 'upcoming';
    if (new Date(v.end_date).getTime() < now) return 'expired';
    return 'active';
  }
  stateCls(v: Voucher): string { return 'st-' + this.state(v); }
  stateLabel(v: Voucher): string {
    return ({ off: 'Tắt', upcoming: 'Sắp diễn ra', expired: 'Hết hạn', active: 'Đang hiệu lực' })[this.state(v)];
  }
}
