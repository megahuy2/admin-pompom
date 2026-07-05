import {
  Component, inject, signal, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Chart, registerables } from 'chart.js';
import { RevenuePoint, TopProduct, TopCustomer, UserBehaviorReport } from '../../core/models/models';
import { ReportService } from '../../core/services/report.service';
import { UploadService } from '../../core/services/upload.service';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  imports: [
    DecimalPipe, FormsModule,
    MatIconModule, MatButtonModule, MatButtonToggleModule, MatProgressBarModule
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Thống kê</h1>
        <p class="sub">Phân tích doanh thu, sản phẩm & hành vi khách hàng</p>
      </div>
      <div class="head-actions">
        <label class="date">Từ <input type="date" [(ngModel)]="from" (change)="reload()" /></label>
        <label class="date">Đến <input type="date" [(ngModel)]="to" (change)="reload()" /></label>
        <button mat-flat-button class="primary" (click)="exportSummary()"><mat-icon>download</mat-icon> Xuất báo cáo</button>
      </div>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    @if (error()) { <p class="error">{{ error() }}</p> }

    <!-- Behavior stat cards -->
    @if (behavior(); as b) {
      <div class="stats">
        <div class="stat"><div class="ic lav"><mat-icon>visibility</mat-icon></div><div><span class="v">{{ b.totalProductViews | number }}</span><span class="l">Lượt xem sản phẩm</span></div></div>
        <div class="stat"><div class="ic gold"><mat-icon>groups</mat-icon></div><div><span class="v">{{ b.engagedUsers | number }}</span><span class="l">User có tương tác</span></div></div>
        <div class="stat"><div class="ic green"><mat-icon>local_shipping</mat-icon></div><div><span class="v">{{ b.deliveredOrders | number }}</span><span class="l">Đơn đã giao</span></div></div>
        <div class="stat"><div class="ic pink"><mat-icon>trending_up</mat-icon></div><div><span class="v">{{ b.conversionRate | number:'1.0-2' }}</span><span class="l">Tỷ lệ chuyển đổi</span></div></div>
      </div>
    }

    <!-- Revenue chart -->
    <section class="card">
      <div class="card-head">
        <div><span class="card-title">Biểu đồ doanh thu</span><span class="card-sub">Chỉ tính đơn đã giao</span></div>
        <mat-button-toggle-group [(ngModel)]="groupBy" (change)="loadRevenue()" hideSingleSelectionIndicator>
          <mat-button-toggle value="day">Ngày</mat-button-toggle>
          <mat-button-toggle value="week">Tuần</mat-button-toggle>
          <mat-button-toggle value="month">Tháng</mat-button-toggle>
        </mat-button-toggle-group>
      </div>
      <div class="chart-wrap"><canvas #revenueCanvas></canvas></div>
      @if (revenueEmpty()) { <p class="empty">Chưa có dữ liệu doanh thu trong khoảng đã chọn.</p> }
    </section>

    <div class="two-col">
      <!-- Top products -->
      <section class="card">
        <span class="card-title">Sản phẩm bán chạy</span>
        @if (topProducts().length === 0 && !loading()) { <p class="empty">Chưa có dữ liệu.</p> }
        @for (p of topProducts(); track p.productId; let i = $index) {
          <div class="rank-row">
            <span class="rank rank-{{ i + 1 }}">{{ i + 1 }}</span>
            @if (p.image_url) { <img class="thumb" [src]="upload.resolveUrl(p.image_url)" alt="" /> }
            @else { <div class="thumb ph"><mat-icon>image</mat-icon></div> }
            <div class="rinfo"><span class="rname">{{ p.name }}</span><span class="rmeta">{{ p.totalRevenue | number }} ₫</span></div>
            <span class="rqty">{{ p.totalQuantity | number }} đã bán</span>
          </div>
        }
      </section>

      <!-- Top customers -->
      <section class="card">
        <span class="card-title">Khách hàng chi tiêu nhiều</span>
        @if (topCustomers().length === 0 && !loading()) { <p class="empty">Chưa có dữ liệu.</p> }
        @for (c of topCustomers(); track c.userId; let i = $index) {
          <div class="rank-row">
            <span class="rank rank-{{ i + 1 }}">{{ i + 1 }}</span>
            @if (c.avatar_url) { <img class="thumb round" [src]="c.avatar_url" alt="" /> }
            @else { <div class="thumb round ph"><mat-icon>person</mat-icon></div> }
            <div class="rinfo"><span class="rname">{{ c.full_name }}</span><span class="rmeta">{{ c.orderCount }} đơn hàng</span></div>
            <span class="rqty">{{ c.totalSpent | number }} ₫</span>
          </div>
        }
      </section>
    </div>

    <!-- Search keywords -->
    @if (behavior()?.topSearches?.length) {
      <section class="card">
        <span class="card-title">Từ khóa tìm kiếm phổ biến</span>
        <div class="chips">
          @for (s of behavior()!.topSearches; track s.keyword) {
            <span class="kw">{{ s.keyword }} <b>{{ s.count }}</b></span>
          }
        </div>
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
    .page-head h1 { margin: 0; } .sub { margin: 2px 0 0; color: var(--brand-text-secondary); font-size: 13px; }
    .head-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .date { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--brand-text-secondary); }
    .date input { border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; padding: 7px 9px; font-family: inherit; }
    .primary { background: var(--brand-pink); color: #fff; }

    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; }
    @media (max-width: 800px) { .stats { grid-template-columns: 1fr 1fr; } }
    .stat { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; padding: 16px; display: flex; align-items: center; gap: 12px; }
    .ic { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
    .ic mat-icon { color: #fff; }
    .ic.lav { background: var(--brand-lavender); } .ic.gold { background: var(--brand-gold); } .ic.green { background: #6ab187; } .ic.pink { background: var(--brand-pink); }
    .stat .v { display: block; font-size: 22px; font-weight: 700; color: var(--brand-text-primary); } .stat .l { font-size: 12px; color: var(--brand-text-secondary); }

    .card { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; padding: 18px; margin-bottom: 16px; }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 12px; }
    .card-title { font-size: 16px; font-weight: 600; color: var(--brand-text-primary); }
    .card-sub { display: block; font-size: 12px; color: var(--brand-text-secondary); }
    .chart-wrap { position: relative; height: 320px; }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 860px) { .two-col { grid-template-columns: 1fr; } }
    .rank-row { display: flex; align-items: center; gap: 12px; padding: 9px 4px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .rank-row:last-child { border-bottom: none; }
    .rank { width: 24px; height: 24px; border-radius: 50%; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; background: var(--brand-pink-light); color: var(--brand-pink); }
    .rank-1 { background: #ffe6a0; color: #a06a00; } .rank-2 { background: #e6e6e6; color: #777; } .rank-3 { background: #f6d5c0; color: #a4571f; }
    .thumb { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; flex: 0 0 auto; } .thumb.round { border-radius: 50%; }
    .thumb.ph { display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #bbb; }
    .rinfo { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .rname { font-size: 14px; color: var(--brand-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rmeta { font-size: 12px; color: var(--brand-text-secondary); }
    .rqty { font-size: 13px; font-weight: 600; color: var(--brand-pink); white-space: nowrap; }

    .chips { display: flex; flex-wrap: wrap; gap: 10px; }
    .kw { background: var(--brand-lavender-light); color: var(--brand-text-primary); padding: 6px 14px; border-radius: 16px; font-size: 14px; }
    .kw b { color: var(--brand-pink); margin-left: 4px; }
    .empty { color: var(--brand-text-secondary); padding: 12px 0; } .error { color: var(--mat-sys-error); }
  `]
})
export class Reports implements OnInit, AfterViewInit, OnDestroy {
  private service = inject(ReportService);
  private snack = inject(MatSnackBar);
  upload = inject(UploadService);

  @ViewChild('revenueCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  topProducts = signal<TopProduct[]>([]);
  topCustomers = signal<TopCustomer[]>([]);
  behavior = signal<UserBehaviorReport | null>(null);
  revenueEmpty = signal(false);
  loading = signal(false);
  error = signal('');
  groupBy: 'day' | 'week' | 'month' = 'month';
  from = '';
  to = '';

  private chart?: Chart;
  private revenuePoints: RevenuePoint[] = [];

  ngOnInit(): void { this.reload(); }
  ngAfterViewInit(): void { if (this.revenuePoints.length) setTimeout(() => this.renderChart(this.revenuePoints), 0); }
  ngOnDestroy(): void { this.chart?.destroy(); }

  reload(): void {
    this.loading.set(true);
    this.loadRevenue();
    this.service.topProducts(10, this.from || undefined, this.to || undefined).subscribe({
      next: (res) => this.topProducts.set(res.data),
      error: (err) => this.error.set(err?.error?.message ?? 'Không tải được báo cáo')
    });
    this.service.topCustomers(10, this.from || undefined, this.to || undefined).subscribe({
      next: (res) => this.topCustomers.set(res.data),
      error: () => {}
    });
    this.service.userBehavior().subscribe({
      next: (b) => this.behavior.set(b),
      error: () => {}
    });
  }

  loadRevenue(): void {
    this.service.revenue({ groupBy: this.groupBy, from: this.from || undefined, to: this.to || undefined }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.revenueEmpty.set(res.data.length === 0);
        this.revenuePoints = res.data;
        setTimeout(() => this.renderChart(res.data), 0);
      },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.message ?? 'Không tải được báo cáo doanh thu'); }
    });
  }

  exportSummary(): void {
    const rows: string[][] = [];
    rows.push(['BÁO CÁO THỐNG KÊ POMPOM']);
    if (this.from || this.to) rows.push([`Khoảng thời gian: ${this.from || '…'} → ${this.to || '…'}`]);
    rows.push([]);
    rows.push(['TOP SẢN PHẨM BÁN CHẠY']);
    rows.push(['#', 'Sản phẩm', 'Đã bán', 'Doanh thu']);
    this.topProducts().forEach((p, i) => rows.push([String(i + 1), p.name, String(p.totalQuantity), String(p.totalRevenue)]));
    rows.push([]);
    rows.push(['TOP KHÁCH HÀNG']);
    rows.push(['#', 'Khách hàng', 'Số đơn', 'Tổng chi tiêu']);
    this.topCustomers().forEach((c, i) => rows.push([String(i + 1), c.full_name, String(c.orderCount), String(c.totalSpent)]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bao-cao-thong-ke-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    this.snack.open('Đã xuất báo cáo thống kê', 'OK', { duration: 2500 });
  }

  private renderChart(points: RevenuePoint[]): void {
    if (!this.canvasRef) return;
    this.chart?.destroy();
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    let fill: CanvasGradient | string = 'rgba(232, 152, 154, 0.15)';
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, 320);
      g.addColorStop(0, 'rgba(232, 152, 154, 0.35)');
      g.addColorStop(1, 'rgba(232, 152, 154, 0.02)');
      fill = g;
    }
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'line',
      data: {
        labels: points.map((p) => p.period),
        datasets: [{
          label: 'Doanh thu (₫)', data: points.map((p) => p.revenue),
          borderColor: '#e8989a', backgroundColor: fill, fill: true, tension: 0.3,
          pointBackgroundColor: '#e8989a', pointRadius: points.length > 30 ? 0 : 3, borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${Number(c.parsed.y).toLocaleString('vi-VN')} ₫` } } },
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => Number(v).toLocaleString('vi-VN') } }, x: { grid: { display: false } } }
      }
    });
  }
}
