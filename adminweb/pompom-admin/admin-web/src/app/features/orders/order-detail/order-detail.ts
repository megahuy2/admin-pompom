import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrderDetail as OrderDetailModel, OrderItem, OrderStatus } from '../../../core/models/models';
import { OrderService } from '../../../core/services/order.service';
import { ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS, ORDER_STATUS_CLASS, TERMINAL_STATUSES } from '../order-status';

@Component({
  selector: 'app-order-detail',
  imports: [
    RouterLink, FormsModule, DatePipe, DecimalPipe,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressBarModule
  ],
  template: `
    <div class="head">
      <button mat-icon-button routerLink="/orders"><mat-icon>arrow_back</mat-icon></button>
      @if (order(); as o) {
        <div class="head-info">
          <h1>{{ o.order_number }}</h1>
          <span class="badge {{ cls(o.status) }}">{{ statusLabel(o.status) }}</span>
        </div>
        <span class="head-date">{{ o.created_at | date:'EEEE, dd/MM/yyyy HH:mm' }}</span>
      }
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    @if (order(); as o) {
      <div class="grid">
        <div class="col-main">
          <!-- Items -->
          <section class="card">
            <h3>Sản phẩm ({{ o.items.length }})</h3>
            <table class="items">
              <thead><tr><th>Sản phẩm</th><th class="r">Đơn giá</th><th class="c">SL</th><th class="r">Thành tiền</th></tr></thead>
              <tbody>
                @for (it of o.items; track it._id) {
                  <tr>
                    <td>{{ productName(it) }}</td>
                    <td class="r">{{ it.price | number }} ₫</td>
                    <td class="c">{{ it.quantity }}</td>
                    <td class="r strong">{{ it.price * it.quantity | number }} ₫</td>
                  </tr>
                }
              </tbody>
            </table>
            <div class="totals">
              <div><span>Tạm tính</span><b>{{ o.total_amount | number }} ₫</b></div>
              <div><span>Phí ship</span><b>{{ o.shipping_fee | number }} ₫</b></div>
              <div><span>Giảm giá</span><b>− {{ o.discount_amount | number }} ₫</b></div>
              <div class="grand"><span>Thành tiền</span><b>{{ o.final_amount | number }} ₫</b></div>
            </div>
          </section>

          <!-- Timeline -->
          <section class="card">
            <h3>Dòng thời gian đơn hàng</h3>
            @if (o.history.length === 0) { <p class="muted">Chưa có lịch sử.</p> }
            <div class="timeline">
              @for (h of timeline(); track h._id; let last = $last) {
                <div class="tl-item">
                  <div class="tl-marker">
                    <span class="tl-dot {{ cls(h.status) }}"></span>
                    @if (!last) { <span class="tl-line"></span> }
                  </div>
                  <div class="tl-body">
                    <span class="badge {{ cls(h.status) }}">{{ statusLabel(h.status) }}</span>
                    <span class="tl-time">{{ h.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
                    @if (h.note) { <p class="tl-note">{{ h.note }}</p> }
                  </div>
                </div>
              }
            </div>
          </section>
        </div>

        <!-- Side -->
        <aside class="col-side">
          <section class="card">
            <h3>Khách hàng</h3>
            <p class="cust"><mat-icon>person</mat-icon> {{ customerName() }}</p>
            @if (customerEmail()) { <p class="cust sub"><mat-icon>mail</mat-icon> {{ customerEmail() }}</p> }
          </section>

          <section class="card">
            <h3>Thanh toán</h3>
            <p><b>{{ o.payment_method }}</b> · <span class="paystatus {{ o.payment_status }}">{{ payLabel(o.payment_status) }}</span></p>
            @if (o.payment_method === 'COD' && o.payment_status !== 'paid') {
              <button mat-stroked-button class="full" (click)="confirmPayment()" [disabled]="saving()">
                <mat-icon>payments</mat-icon> Xác nhận đã thu COD
              </button>
            }
          </section>

          <section class="card">
            <h3>Cập nhật trạng thái</h3>
            @if (isTerminal()) {
              <p class="muted">Đơn đã ở trạng thái cuối, không thể đổi tiếp.</p>
            } @else {
              <label class="fld">Trạng thái mới
                <select [(ngModel)]="newStatus">
                  <option value="">— Chọn —</option>
                  @for (s of statusOptions; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
                </select>
              </label>
              <label class="fld">Ghi chú
                <input [(ngModel)]="note" placeholder="Ghi chú (tuỳ chọn)" />
              </label>
              <button mat-flat-button class="submit" (click)="changeStatus()" [disabled]="!newStatus || saving()">
                Đổi trạng thái
              </button>
            }
          </section>
        </aside>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .head-info { display: flex; align-items: center; gap: 12px; }
    .head-info h1 { margin: 0; font-size: 22px; }
    .head-date { color: var(--brand-text-secondary); font-size: 13px; text-transform: capitalize; margin-left: auto; }
    .grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .card { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; padding: 18px; margin-bottom: 16px; }
    .card h3 { margin: 0 0 14px; font-size: 16px; }

    .items { width: 100%; border-collapse: collapse; font-size: 14px; }
    .items th { text-align: left; font-size: 12px; color: var(--brand-text-secondary); padding: 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .items td { padding: 10px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .items .r { text-align: right; } .items .c { text-align: center; } .strong { font-weight: 700; }
    .totals { margin-top: 14px; }
    .totals > div { display: flex; justify-content: space-between; padding: 5px 8px; font-size: 14px; color: var(--brand-text-secondary); }
    .totals .grand { border-top: 1px solid var(--mat-sys-outline-variant); margin-top: 6px; padding-top: 12px; font-size: 17px; color: var(--brand-text-primary); }

    .timeline { position: relative; }
    .tl-item { display: flex; gap: 14px; }
    .tl-marker { display: flex; flex-direction: column; align-items: center; }
    .tl-dot { width: 14px; height: 14px; border-radius: 50%; margin-top: 3px; flex: 0 0 auto; border: 2px solid #fff; box-shadow: 0 0 0 2px currentColor; }
    .tl-line { flex: 1; width: 2px; background: var(--mat-sys-outline-variant); margin: 4px 0; min-height: 26px; }
    .tl-body { padding-bottom: 20px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
    .tl-time { font-size: 12px; color: var(--brand-text-secondary); }
    .tl-note { margin: 2px 0 0; font-size: 13px; color: var(--brand-text-secondary); }

    .cust { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; }
    .cust mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--brand-text-secondary); }
    .cust.sub { font-size: 13px; color: var(--brand-text-secondary); }
    .fld { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 600; color: var(--brand-text-secondary); margin-bottom: 12px; }
    .fld select, .fld input { border: 1px solid var(--mat-sys-outline-variant); border-radius: 9px; padding: 9px 11px; font-size: 14px; font-family: inherit; }
    .full, .submit { width: 100%; }
    .submit { background: var(--brand-pink); color: #fff; margin-top: 4px; }
    .muted { color: var(--brand-text-secondary); }

    .badge { font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 10px; }
    .paystatus { font-size: 12px; font-weight: 600; padding: 2px 9px; border-radius: 8px; }
    .paystatus.paid { background: #dcefe4; color: #2f7d52; } .paystatus.pending { background: #f8ebcf; color: #8a6d1a; }
    .paystatus.failed { background: #ffdad6; color: #b3261e; } .paystatus.refunded { background: #eee; color: #777; }
    .st-pending { background: #f8ebcf; color: #8a6d1a; } .st-paid { background: #dbe7ff; color: #2f5bbd; }
    .st-preparing { background: var(--brand-lavender-light); color: #7a4f63; } .st-shipping { background: var(--brand-pink-light); color: #a23a4d; }
    .st-delivered { background: #dcefe4; color: #2f7d52; } .st-returned { background: #fde3cf; color: #b5591a; }
    .st-cancelled { background: #eeeeee; color: #777; }
    .tl-dot.st-pending { color: #d7b77a; } .tl-dot.st-paid { color: #5b8def; }
    .tl-dot.st-preparing { color: var(--brand-lavender); } .tl-dot.st-shipping { color: var(--brand-pink); }
    .tl-dot.st-delivered { color: #6ab187; } .tl-dot.st-returned { color: #b5591a; } .tl-dot.st-cancelled { color: #bdbdbd; }
  `]
})
export class OrderDetail implements OnInit {
  private service = inject(OrderService);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  order = signal<OrderDetailModel | null>(null);
  loading = signal(false);
  saving = signal(false);
  newStatus: OrderStatus | '' = '';
  note = '';
  statusOptions = ORDER_STATUS_OPTIONS;

  isTerminal = computed(() => {
    const o = this.order();
    return o ? TERMINAL_STATUSES.includes(o.status) : false;
  });
  // Timeline mới nhất ở trên cùng
  timeline = computed(() => {
    const o = this.order();
    return o ? [...o.history].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)) : [];
  });

  private id = '';

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getById(this.id).subscribe({
      next: (o) => { this.order.set(o); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  changeStatus(): void {
    if (!this.newStatus) return;
    this.saving.set(true);
    this.service.updateStatus(this.id, this.newStatus, this.note).subscribe({
      next: () => {
        this.saving.set(false); this.note = ''; this.newStatus = '';
        this.snack.open('Đã đổi trạng thái', 'OK', { duration: 2500 });
        this.load();
      },
      error: (err) => { this.saving.set(false); this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 }); }
    });
  }

  confirmPayment(): void {
    this.saving.set(true);
    this.service.confirmPayment(this.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Đã xác nhận thanh toán COD', 'OK', { duration: 2500 });
        this.load();
      },
      error: (err) => { this.saving.set(false); this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 }); }
    });
  }

  statusLabel(s: string): string { return ORDER_STATUS_LABELS[s] ?? s; }
  cls(s: string): string { return ORDER_STATUS_CLASS[s] ?? ''; }
  payLabel(s: string): string {
    return ({ paid: 'Đã trả', pending: 'Chưa trả', failed: 'Thất bại', refunded: 'Hoàn tiền' } as Record<string, string>)[s] ?? s;
  }
  customerName(): string {
    const o = this.order();
    if (o?.user_id && typeof o.user_id === 'object') return o.user_id.full_name;
    return 'Khách vãng lai';
  }
  customerEmail(): string {
    const o = this.order();
    if (o?.user_id && typeof o.user_id === 'object') return (o.user_id as { email?: string }).email ?? '';
    return '';
  }
  productName(it: OrderItem): string {
    if (it.product_id && typeof it.product_id === 'object') return it.product_id.name;
    return '(sản phẩm)';
  }
}
