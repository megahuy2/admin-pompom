import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrderService } from '../../core/services/order.service';
import { ReportService } from '../../core/services/report.service';
import { ORDER_STATUS_LABELS } from '../orders/order-status';

@Component({
  selector: 'app-report-export',
  imports: [FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Báo cáo</h1>
        <p class="sub">Xuất dữ liệu ra file CSV (mở bằng Excel)</p>
      </div>
      <div class="range">
        <label class="date">Từ <input type="date" [(ngModel)]="from" /></label>
        <label class="date">Đến <input type="date" [(ngModel)]="to" /></label>
      </div>
    </div>

    <div class="grid">
      @for (r of reports; track r.key) {
        <div class="card">
          <div class="ic {{ r.color }}"><mat-icon>{{ r.icon }}</mat-icon></div>
          <h3>{{ r.title }}</h3>
          <p>{{ r.desc }}</p>
          <button mat-flat-button class="primary" (click)="run(r.key)" [disabled]="busy() === r.key">
            <mat-icon>download</mat-icon> {{ busy() === r.key ? 'Đang xuất…' : 'Xuất CSV' }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
    .page-head h1 { margin: 0; } .sub { margin: 2px 0 0; color: var(--brand-text-secondary); font-size: 13px; }
    .range { display: flex; gap: 10px; }
    .date { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--brand-text-secondary); }
    .date input { border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; padding: 7px 9px; font-family: inherit; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .card { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 16px; padding: 22px; text-align: center; transition: transform .15s, box-shadow .15s; }
    .card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(232,152,154,.18); }
    .ic { width: 60px; height: 60px; border-radius: 16px; margin: 0 auto 14px; display: flex; align-items: center; justify-content: center; }
    .ic mat-icon { color: #fff; font-size: 30px; width: 30px; height: 30px; }
    .ic.pink { background: var(--brand-pink); } .ic.gold { background: var(--brand-gold); } .ic.green { background: #6ab187; } .ic.lav { background: var(--brand-lavender); }
    .card h3 { margin: 0 0 6px; font-size: 16px; } .card p { margin: 0 0 16px; color: var(--brand-text-secondary); font-size: 13px; min-height: 36px; }
    .primary { background: var(--brand-pink); color: #fff; }
  `]
})
export class ReportExport {
  private orders = inject(OrderService);
  private reportSvc = inject(ReportService);
  private snack = inject(MatSnackBar);

  from = '';
  to = '';
  busy = signal<string | null>(null);

  reports = [
    { key: 'orders', title: 'Đơn hàng', desc: 'Toàn bộ đơn hàng trong khoảng thời gian', icon: 'receipt_long', color: 'pink' },
    { key: 'revenue', title: 'Doanh thu', desc: 'Doanh thu theo tháng (đơn đã giao)', icon: 'payments', color: 'green' },
    { key: 'products', title: 'Sản phẩm bán chạy', desc: 'Xếp hạng sản phẩm theo số lượng bán', icon: 'inventory_2', color: 'gold' },
    { key: 'customers', title: 'Khách hàng', desc: 'Khách hàng chi tiêu nhiều nhất', icon: 'group', color: 'lav' }
  ];

  private download(name: string, rows: (string | number)[][]): void {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }
  private done(msg: string): void { this.busy.set(null); this.snack.open(msg, 'OK', { duration: 2500 }); }
  private fail(): void { this.busy.set(null); this.snack.open('Không xuất được báo cáo', 'Đóng', { duration: 3000 }); }

  run(key: string): void {
    this.busy.set(key);
    const f = this.from || undefined; const t = this.to || undefined;

    if (key === 'orders') {
      this.orders.list({ page: 1, limit: 100000, from: f, to: t }).subscribe({
        next: (res) => {
          const rows: (string | number)[][] = [['Mã đơn', 'Khách hàng', 'SL', 'Tổng tiền', 'Trạng thái', 'Thanh toán', 'Ngày tạo']];
          res.data.forEach((o) => rows.push([
            o.order_number,
            (o.user_id && typeof o.user_id === 'object') ? o.user_id.full_name : 'Khách vãng lai',
            o.item_qty || 0, o.final_amount, ORDER_STATUS_LABELS[o.status] || o.status,
            o.payment_method, new Date(o.created_at).toLocaleString('vi-VN')
          ]));
          this.download('bao-cao-don-hang', rows); this.done(`Đã xuất ${res.data.length} đơn`);
        }, error: () => this.fail()
      });
    } else if (key === 'revenue') {
      this.reportSvc.revenue({ groupBy: 'month', from: f, to: t }).subscribe({
        next: (res) => {
          const rows: (string | number)[][] = [['Tháng', 'Số đơn', 'Doanh thu']];
          res.data.forEach((p) => rows.push([p.period, p.orders, p.revenue]));
          this.download('bao-cao-doanh-thu', rows); this.done('Đã xuất báo cáo doanh thu');
        }, error: () => this.fail()
      });
    } else if (key === 'products') {
      this.reportSvc.topProducts(50, f, t).subscribe({
        next: (res) => {
          const rows: (string | number)[][] = [['#', 'Sản phẩm', 'Đã bán', 'Doanh thu']];
          res.data.forEach((p, i) => rows.push([i + 1, p.name, p.totalQuantity, p.totalRevenue]));
          this.download('bao-cao-san-pham', rows); this.done('Đã xuất báo cáo sản phẩm');
        }, error: () => this.fail()
      });
    } else if (key === 'customers') {
      this.reportSvc.topCustomers(50, f, t).subscribe({
        next: (res) => {
          const rows: (string | number)[][] = [['#', 'Khách hàng', 'Email', 'Số đơn', 'Tổng chi tiêu']];
          res.data.forEach((c, i) => rows.push([i + 1, c.full_name, c.email, c.orderCount, c.totalSpent]));
          this.download('bao-cao-khach-hang', rows); this.done('Đã xuất báo cáo khách hàng');
        }, error: () => this.fail()
      });
    }
  }
}
