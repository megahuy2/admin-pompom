import { Component, inject, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Order, OrderStatus } from '../../../core/models/models';
import { OrderService, ImportRow } from '../../../core/services/order.service';
import { ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS, ORDER_STATUS_CLASS, TERMINAL_STATUSES } from '../order-status';

interface SortOpt { value: string; label: string; sortBy: 'created_at' | 'final_amount'; sortDir: 'asc' | 'desc'; }

@Component({
  selector: 'app-order-list',
  imports: [
    RouterLink, FormsModule, DatePipe, DecimalPipe,
    MatButtonModule, MatIconModule, MatMenuModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Đơn hàng</h1>
        <p class="sub">{{ total() | number }} đơn hàng</p>
      </div>
      <div class="head-actions">
        <button mat-stroked-button (click)="fileInput.click()"><mat-icon>upload_file</mat-icon> Nhập</button>
        <button mat-stroked-button (click)="exportExcel()" [disabled]="exporting()">
          <mat-icon>download</mat-icon> Xuất Excel
        </button>
        <button mat-flat-button class="primary" routerLink="/orders/new"><mat-icon>add</mat-icon> Tạo đơn</button>
        <input #fileInput type="file" accept=".csv,text/csv" hidden (change)="onImportFile($event)" />
      </div>
    </div>

    <!-- Quick status filter -->
    <div class="chips">
      <button class="chip" [class.on]="status === ''" (click)="setStatus('')">Tất cả</button>
      @for (s of statusOptions; track s.value) {
        <button class="chip {{ cls(s.value) }}" [class.on]="status === s.value" (click)="setStatus(s.value)">{{ s.label }}</button>
      }
    </div>

    <!-- Search + filters -->
    <div class="toolbar">
      <div class="search">
        <mat-icon>search</mat-icon>
        <input [(ngModel)]="search" (keyup.enter)="applyFilter()" placeholder="Tìm theo mã đơn…" />
        @if (search) { <mat-icon class="clear" (click)="search=''; applyFilter()">close</mat-icon> }
      </div>
      <label class="date">Từ <input type="date" [(ngModel)]="from" (change)="applyFilter()" /></label>
      <label class="date">Đến <input type="date" [(ngModel)]="to" (change)="applyFilter()" /></label>
      <button mat-stroked-button [matMenuTriggerFor]="sortMenu" class="sort-btn">
        <mat-icon>swap_vert</mat-icon> {{ currentSort().label }}
      </button>
      <mat-menu #sortMenu="matMenu">
        @for (o of sortOptions; track o.value) {
          <button mat-menu-item (click)="setSort(o)">{{ o.label }}</button>
        }
      </mat-menu>
    </div>

    <!-- Bulk action bar -->
    @if (selected().size > 0) {
      <div class="bulk-bar">
        <span><b>{{ selected().size }}</b> đơn được chọn</span>
        <button mat-button [matMenuTriggerFor]="bulkMenu"><mat-icon>edit</mat-icon> Đổi trạng thái</button>
        <mat-menu #bulkMenu="matMenu">
          @for (s of statusOptions; track s.value) {
            <button mat-menu-item (click)="bulkApply(s.value)">{{ s.label }}</button>
          }
        </mat-menu>
        <button mat-button (click)="clearSelection()">Bỏ chọn</button>
      </div>
    }

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th class="chk"><input type="checkbox" [checked]="allChecked()" (change)="toggleAll($event)" /></th>
            <th>Mã đơn</th>
            <th>Khách hàng</th>
            <th class="num">SL</th>
            <th class="num">Tổng tiền</th>
            <th>Trạng thái</th>
            <th>Thanh toán</th>
            <th>Ngày tạo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (o of orders(); track o._id) {
            <tr [class.sel]="selected().has(o._id)">
              <td class="chk"><input type="checkbox" [checked]="selected().has(o._id)" (change)="toggle(o._id)" /></td>
              <td><a class="onum" [routerLink]="['/orders', o._id]">{{ o.order_number }}</a></td>
              <td>{{ customerName(o) }}</td>
              <td class="num">{{ o.item_qty || 0 }}</td>
              <td class="num strong">{{ o.final_amount | number }} ₫</td>
              <td><span class="badge {{ cls(o.status) }}">{{ statusLabel(o.status) }}</span></td>
              <td><span class="pay">{{ o.payment_method }}</span> <span class="paystatus {{ o.payment_status }}">{{ payLabel(o.payment_status) }}</span></td>
              <td class="muted">{{ o.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
              <td><button mat-icon-button [routerLink]="['/orders', o._id]" matTooltip="Chi tiết"><mat-icon>chevron_right</mat-icon></button></td>
            </tr>
          }
        </tbody>
      </table>
      @if (!loading() && orders().length === 0) {
        <div class="empty"><mat-icon>receipt_long</mat-icon><p>Không có đơn hàng nào khớp bộ lọc.</p></div>
      }
    </div>

    <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page() - 1"
      [pageSizeOptions]="[10, 20, 50, 100]" (page)="onPage($event)"></mat-paginator>
  `,
  styles: [`
    :host { display: block; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; }
    .page-head h1 { margin: 0; }
    .sub { margin: 2px 0 0; color: var(--brand-text-secondary); font-size: 13px; }
    .head-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .head-actions .primary { background: var(--brand-pink); color: #fff; }

    .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .chip {
      border: 1px solid var(--mat-sys-outline-variant); background: var(--mat-sys-surface); color: var(--brand-text-secondary);
      padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s;
    }
    .chip:hover { border-color: var(--brand-pink); color: var(--brand-pink); }
    .chip.on { background: linear-gradient(135deg, var(--brand-pink), var(--brand-lavender)); color: #fff; border-color: transparent; }

    .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
    .search {
      display: flex; align-items: center; gap: 8px; background: var(--mat-sys-surface);
      border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 8px 12px; flex: 1; min-width: 220px; max-width: 380px;
    }
    .search:focus-within { border-color: var(--brand-pink); box-shadow: 0 0 0 3px var(--brand-pink-light); }
    .search input { border: none; outline: none; background: transparent; width: 100%; font-size: 14px; color: var(--brand-text-primary); }
    .search mat-icon { color: var(--brand-text-secondary); font-size: 20px; }
    .search .clear { cursor: pointer; }
    .date { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--brand-text-secondary); }
    .date input { border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; padding: 7px 9px; font-family: inherit; }
    .sort-btn { color: var(--brand-text-secondary); }

    .bulk-bar {
      display: flex; align-items: center; gap: 12px; background: var(--brand-pink-light); border: 1px solid var(--brand-pink);
      border-radius: 12px; padding: 8px 16px; margin-bottom: 12px; animation: slidein .2s ease;
    }
    @keyframes slidein { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

    .table-wrap { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; overflow: auto; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
    .tbl thead th {
      text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
      color: var(--brand-text-secondary); padding: 12px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); white-space: nowrap;
    }
    .tbl tbody td { padding: 11px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); vertical-align: middle; }
    .tbl tbody tr:last-child td { border-bottom: none; }
    .tbl tbody tr { transition: background .12s; }
    .tbl tbody tr:hover { background: var(--mat-sys-surface-variant); }
    .tbl tbody tr.sel { background: var(--brand-pink-light); }
    .chk { width: 40px; text-align: center; }
    .chk input { width: 16px; height: 16px; accent-color: var(--brand-pink); cursor: pointer; }
    .num { text-align: right; }
    .strong { font-weight: 700; color: var(--brand-text-primary); }
    .muted { color: var(--brand-text-secondary); white-space: nowrap; }
    .onum { color: var(--brand-pink); font-weight: 600; text-decoration: none; }
    .onum:hover { text-decoration: underline; }
    .pay { font-weight: 600; font-size: 13px; }
    .paystatus { font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 8px; margin-left: 4px; }
    .paystatus.paid { background: #dcefe4; color: #2f7d52; }
    .paystatus.pending { background: #f8ebcf; color: #8a6d1a; }
    .paystatus.failed { background: #ffdad6; color: #b3261e; }
    .paystatus.refunded { background: #eee; color: #777; }

    .badge { font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 10px; white-space: nowrap; }
    .chip.st-pending.on, .chip.st-paid.on, .chip.st-preparing.on, .chip.st-shipping.on,
    .chip.st-delivered.on, .chip.st-returned.on, .chip.st-cancelled.on { color: #fff; }
    .st-pending { background: #f8ebcf; color: #8a6d1a; }
    .st-paid { background: #dbe7ff; color: #2f5bbd; }
    .st-preparing { background: var(--brand-lavender-light); color: #7a4f63; }
    .st-shipping { background: var(--brand-pink-light); color: #a23a4d; }
    .st-delivered { background: #dcefe4; color: #2f7d52; }
    .st-returned { background: #fde3cf; color: #b5591a; }
    .st-cancelled { background: #eeeeee; color: #777; }

    .empty { text-align: center; padding: 48px 20px; color: var(--brand-text-secondary); }
    .empty mat-icon { font-size: 42px; width: 42px; height: 42px; opacity: .4; }
    .empty p { margin: 8px 0 0; }
  `]
})
export class OrderList implements OnInit {
  private service = inject(OrderService);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  orders = signal<Order[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  exporting = signal(false);
  selected = signal<Set<string>>(new Set());
  limit = 20;

  search = '';
  status = '';
  from = '';
  to = '';
  sortBy: 'created_at' | 'final_amount' = 'created_at';
  sortDir: 'asc' | 'desc' = 'desc';

  statusOptions = ORDER_STATUS_OPTIONS;
  sortOptions: SortOpt[] = [
    { value: 'newest', label: 'Mới nhất', sortBy: 'created_at', sortDir: 'desc' },
    { value: 'oldest', label: 'Cũ nhất', sortBy: 'created_at', sortDir: 'asc' },
    { value: 'amount_desc', label: 'Tổng tiền cao → thấp', sortBy: 'final_amount', sortDir: 'desc' },
    { value: 'amount_asc', label: 'Tổng tiền thấp → cao', sortBy: 'final_amount', sortDir: 'asc' }
  ];

  currentSort = computed(() =>
    this.sortOptions.find((o) => o.sortBy === this.sortBy && o.sortDir === this.sortDir) ?? this.sortOptions[0]
  );
  allChecked = computed(() => this.orders().length > 0 && this.orders().every((o) => this.selected().has(o._id)));

  ngOnInit(): void {
    // Khởi tạo bộ lọc từ query params (link từ Dashboard: /orders?status=pending, ?search=)
    const qp = this.route.snapshot.queryParamMap;
    this.status = qp.get('status') || '';
    this.search = qp.get('search') || '';
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list({
      page: this.page(), limit: this.limit, search: this.search, status: this.status,
      from: this.from, to: this.to, sortBy: this.sortBy, sortDir: this.sortDir
    }).subscribe({
      next: (res) => { this.orders.set(res.data); this.total.set(res.total); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  applyFilter(): void { this.page.set(1); this.clearSelection(); this.load(); }
  setStatus(s: string): void { this.status = s; this.applyFilter(); }
  setSort(o: SortOpt): void { this.sortBy = o.sortBy; this.sortDir = o.sortDir; this.applyFilter(); }
  onPage(e: PageEvent): void { this.limit = e.pageSize; this.page.set(e.pageIndex + 1); this.clearSelection(); this.load(); }

  // --- Selection ---
  toggle(id: string): void {
    const s = new Set(this.selected());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selected.set(s);
  }
  toggleAll(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.selected.set(checked ? new Set(this.orders().map((o) => o._id)) : new Set());
  }
  clearSelection(): void { this.selected.set(new Set()); }

  bulkApply(status: string): void {
    const ids = [...this.selected()];
    this.service.bulkStatus(ids, status as OrderStatus).subscribe({
      next: (res) => {
        let msg = res.message;
        if (res.skipped?.length) msg += ` (bỏ qua ${res.skipped.length} đơn ở trạng thái cuối)`;
        this.snack.open(msg, 'OK', { duration: 3000 });
        this.clearSelection();
        this.load();
      },
      error: (err) => this.snack.open(err?.error?.message ?? 'Lỗi cập nhật', 'Đóng', { duration: 3000 })
    });
  }

  // --- Export CSV (mở được bằng Excel) ---
  exportExcel(): void {
    this.exporting.set(true);
    this.service.list({
      page: 1, limit: Math.max(this.total(), 1), search: this.search, status: this.status,
      from: this.from, to: this.to, sortBy: this.sortBy, sortDir: this.sortDir
    }).subscribe({
      next: (res) => {
        const header = ['Mã đơn', 'Khách hàng', 'Số lượng', 'Tổng tiền', 'Trạng thái', 'Thanh toán', 'TT thanh toán', 'Ngày tạo'];
        const rows = res.data.map((o) => [
          o.order_number, this.customerName(o), String(o.item_qty || 0), String(o.final_amount),
          this.statusLabel(o.status), o.payment_method, this.payLabel(o.payment_status),
          new Date(o.created_at).toLocaleString('vi-VN')
        ]);
        const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `don-hang-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
        this.exporting.set(false);
        this.snack.open(`Đã xuất ${res.data.length} đơn`, 'OK', { duration: 2500 });
      },
      error: () => { this.exporting.set(false); this.snack.open('Không xuất được', 'Đóng', { duration: 3000 }); }
    });
  }

  // --- Import CSV: customer_email,product_sku,quantity,payment_method ---
  onImportFile(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const rows = this.parseCsv(text);
      if (!rows.length) { this.snack.open('File không có dữ liệu hợp lệ', 'Đóng', { duration: 3000 }); return; }
      this.service.importOrders(rows).subscribe({
        next: (res) => {
          let msg = res.message;
          if (res.errors?.length) msg += ` · ${res.errors.length} dòng lỗi`;
          this.snack.open(msg, 'OK', { duration: 4000 });
          this.applyFilter();
        },
        error: (err) => this.snack.open(err?.error?.message ?? 'Nhập thất bại', 'Đóng', { duration: 3000 })
      });
    };
    reader.readAsText(file);
    input.value = '';
  }

  private parseCsv(text: string): ImportRow[] {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    // Bỏ dòng tiêu đề nếu có
    const first = lines[0].toLowerCase();
    const start = (first.includes('sku') || first.includes('product')) ? 1 : 0;
    const rows: ImportRow[] = [];
    for (let i = start; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      if (!cols[1] && !cols[0]) continue;
      // Định dạng: customer_email, product_sku, quantity, payment_method
      rows.push({
        customer_email: cols[0] || undefined,
        product_sku: cols[1] || cols[0],
        quantity: parseInt(cols[2]) || 1,
        payment_method: cols[3] || undefined
      });
    }
    return rows;
  }

  // --- Helpers ---
  statusLabel(s: string): string { return ORDER_STATUS_LABELS[s] ?? s; }
  cls(s: string): string { return ORDER_STATUS_CLASS[s] ?? ''; }
  payLabel(s: string): string {
    return ({ paid: 'Đã trả', pending: 'Chưa trả', failed: 'Thất bại', refunded: 'Hoàn tiền' } as Record<string, string>)[s] ?? s;
  }
  customerName(o: Order): string {
    if (o.user_id && typeof o.user_id === 'object') return o.user_id.full_name;
    return 'Khách vãng lai';
  }
}
