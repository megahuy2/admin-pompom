import {
  Component, inject, signal, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef
} from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { DashboardSummary, Order, OrderStatus, RevenuePoint, TopProduct } from '../../core/models/models';
import { DashboardService } from '../../core/services/dashboard.service';
import { ReportService } from '../../core/services/report.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';

Chart.register(...registerables);

interface StatusMeta { key: OrderStatus; label: string; cls: string; }

@Component({
  selector: 'app-dashboard',
  imports: [
    DecimalPipe, DatePipe, RouterLink, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatProgressBarModule, MatButtonToggleModule
  ],
  template: `
    <!-- Greeting -->
    <div class="greeting">
      <div>
        <h1>Xin chào, {{ auth.currentUser()?.full_name || 'Admin' }} 👋</h1>
        <p class="date">{{ today | date:'EEEE, dd MMMM yyyy' }}</p>
      </div>
      <button mat-stroked-button (click)="reload()" [disabled]="loading()">
        <mat-icon>refresh</mat-icon> Làm mới
      </button>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    @if (error()) { <p class="error">{{ error() }}</p> }

    <!-- KPI cards -->
    @if (data(); as d) {
      <div class="cards">
        <mat-card class="stat accent-pink">
          <div class="stat-top">
            <div class="icon"><mat-icon>payments</mat-icon></div>
            <span class="badge">Tổng</span>
          </div>
          <span class="value">{{ d.totalRevenue | number }} ₫</span>
          <span class="label">Tổng doanh thu (đã giao)</span>
          <span class="sub"><mat-icon>today</mat-icon> Hôm nay: {{ d.todayRevenue | number }} ₫</span>
        </mat-card>

        <mat-card class="stat accent-lavender">
          <div class="stat-top">
            <div class="icon"><mat-icon>receipt_long</mat-icon></div>
            <span class="badge">{{ d.todayOrders }} hôm nay</span>
          </div>
          <span class="value">{{ d.totalOrders | number }}</span>
          <span class="label">Tổng đơn hàng</span>
          <span class="sub"><mat-icon>check_circle</mat-icon> {{ d.ordersByStatus.delivered | number }} đã giao</span>
        </mat-card>

        <mat-card class="stat accent-gold">
          <div class="stat-top">
            <div class="icon"><mat-icon>group</mat-icon></div>
            <span class="badge">+{{ d.newUsersLast30Days }}</span>
          </div>
          <span class="value">{{ d.totalUsers | number }}</span>
          <span class="label">Người dùng</span>
          <span class="sub"><mat-icon>person_add</mat-icon> {{ d.newUsersLast30Days }} mới trong 30 ngày</span>
        </mat-card>

        <mat-card class="stat accent-green">
          <div class="stat-top">
            <div class="icon"><mat-icon>local_mall</mat-icon></div>
            <span class="badge">Hôm nay</span>
          </div>
          <span class="value">{{ d.todayOrders | number }}</span>
          <span class="label">Đơn hàng hôm nay</span>
          <span class="sub"><mat-icon>payments</mat-icon> {{ d.todayRevenue | number }} ₫ doanh thu</span>
        </mat-card>
      </div>

      <!-- Order status strip -->
      <div class="status-strip">
        @for (s of statusList; track s.key) {
          <div class="status-pill {{ s.cls }}">
            <span class="dot"></span>
            <div>
              <span class="status-count">{{ d.ordersByStatus[s.key] | number }}</span>
              <span class="status-label">{{ s.label }}</span>
            </div>
          </div>
        }
      </div>
    }

    <!-- Revenue chart -->
    <mat-card class="chart-card">
      <div class="card-head">
        <div>
          <span class="card-title">Doanh thu theo thời gian</span>
          <span class="card-sub">Chỉ tính đơn đã giao</span>
        </div>
        <mat-button-toggle-group [(ngModel)]="groupBy" (change)="loadRevenue()" hideSingleSelectionIndicator>
          <mat-button-toggle value="day">Ngày</mat-button-toggle>
          <mat-button-toggle value="week">Tuần</mat-button-toggle>
          <mat-button-toggle value="month">Tháng</mat-button-toggle>
        </mat-button-toggle-group>
      </div>
      <div class="chart-wrap"><canvas #revenueCanvas></canvas></div>
      @if (revenueEmpty()) { <p class="empty">Chưa có dữ liệu doanh thu.</p> }
    </mat-card>

    <!-- Two-column: recent orders + top products -->
    <div class="two-col">
      <mat-card class="panel">
        <div class="card-head">
          <span class="card-title">Đơn hàng gần đây</span>
          <a mat-button color="primary" routerLink="/orders">Xem tất cả</a>
        </div>
        @if (recentOrders().length === 0 && !loading()) { <p class="empty">Chưa có đơn hàng.</p> }
        @for (o of recentOrders(); track o._id) {
          <a class="order-row" [routerLink]="['/orders', o._id]">
            <div class="order-main">
              <span class="order-num">{{ o.order_number }}</span>
              <span class="order-cust">{{ customerName(o) }}</span>
            </div>
            <div class="order-right">
              <span class="order-amount">{{ o.final_amount | number }} ₫</span>
              <span class="status-badge {{ statusCls(o.status) }}">{{ statusLabel(o.status) }}</span>
            </div>
          </a>
        }
      </mat-card>

      <mat-card class="panel">
        <div class="card-head">
          <span class="card-title">Sản phẩm bán chạy</span>
          <a mat-button color="primary" routerLink="/reports">Chi tiết</a>
        </div>
        @if (topProducts().length === 0 && !loading()) { <p class="empty">Chưa có dữ liệu.</p> }
        @for (p of topProducts(); track p.productId; let i = $index) {
          <div class="product-row">
            <span class="rank">{{ i + 1 }}</span>
            @if (p.image_url) {
              <img class="thumb" [src]="upload.resolveUrl(p.image_url)" alt="{{ p.name }}" />
            } @else {
              <div class="thumb placeholder"><mat-icon>image</mat-icon></div>
            }
            <div class="product-info">
              <span class="product-name">{{ p.name }}</span>
              <span class="product-meta">{{ p.totalRevenue | number }} ₫</span>
            </div>
            <span class="product-qty">{{ p.totalQuantity | number }} đã bán</span>
          </div>
        }
      </mat-card>
    </div>

    <!-- Quick actions -->
    <mat-card class="quick">
      <span class="card-title">Lối tắt</span>
      <div class="quick-grid">
        <a class="quick-item" routerLink="/products/new"><mat-icon>add_box</mat-icon><span>Thêm sản phẩm</span></a>
        <a class="quick-item" routerLink="/orders"><mat-icon>receipt_long</mat-icon><span>Quản lý đơn hàng</span></a>
        <a class="quick-item" routerLink="/moderation"><mat-icon>fact_check</mat-icon><span>Duyệt nội dung</span></a>
        <a class="quick-item" routerLink="/reports"><mat-icon>bar_chart</mat-icon><span>Báo cáo</span></a>
        <a class="quick-item" routerLink="/content/banners"><mat-icon>view_carousel</mat-icon><span>Banner</span></a>
      </div>
    </mat-card>
  `,
  styles: [`
    .greeting { display: flex; justify-content: space-between; align-items: flex-start; }
    .greeting h1 { margin-bottom: 2px; }
    .date { color: var(--brand-text-secondary); margin: 0; text-transform: capitalize; }

    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin: 16px 0; }
    .stat { padding: 18px; border-radius: 16px; display: flex; flex-direction: column; position: relative; overflow: hidden; }
    .stat::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; }
    .stat.accent-pink::before { background: var(--brand-pink); }
    .stat.accent-lavender::before { background: var(--brand-lavender); }
    .stat.accent-gold::before { background: var(--brand-gold); }
    .stat.accent-green::before { background: #6ab187; }
    .stat-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .accent-pink .icon { background: var(--brand-pink-light); color: var(--brand-pink); }
    .accent-lavender .icon { background: var(--brand-lavender-light); color: var(--brand-lavender); }
    .accent-gold .icon { background: var(--brand-gold-light); color: var(--brand-gold); }
    .accent-green .icon { background: #dcefe4; color: #6ab187; }
    .badge { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 12px; background: var(--mat-sys-surface-variant); color: var(--brand-text-secondary); }
    .value { font-size: 26px; font-weight: 700; color: var(--brand-text-primary); }
    .label { font-size: 13px; color: var(--brand-text-secondary); }
    .sub { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--brand-text-secondary); margin-top: 8px; }
    .sub mat-icon { font-size: 15px; width: 15px; height: 15px; }

    .status-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .status-pill { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 12px; background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); }
    .status-pill .dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
    .status-count { display: block; font-size: 18px; font-weight: 700; color: var(--brand-text-primary); }
    .status-label { font-size: 12px; color: var(--brand-text-secondary); }

    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .card-title { font-size: 16px; font-weight: 600; color: var(--brand-text-primary); }
    .card-sub { display: block; font-size: 12px; color: var(--brand-text-secondary); }
    .chart-card { padding: 18px; margin-bottom: 16px; border-radius: 16px; }
    .chart-wrap { position: relative; height: 300px; }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }
    .panel { padding: 18px; border-radius: 16px; }

    .order-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 8px; border-radius: 10px; text-decoration: none; transition: background .15s; }
    .order-row:hover { background: var(--mat-sys-surface-variant); }
    .order-main { display: flex; flex-direction: column; }
    .order-num { font-weight: 600; color: var(--brand-text-primary); font-size: 14px; }
    .order-cust { font-size: 12px; color: var(--brand-text-secondary); }
    .order-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .order-amount { font-weight: 600; color: var(--brand-text-primary); font-size: 14px; }

    .product-row { display: flex; align-items: center; gap: 12px; padding: 8px; }
    .rank { width: 22px; height: 22px; border-radius: 50%; background: var(--brand-pink-light); color: var(--brand-pink); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
    .thumb { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; }
    .thumb.placeholder { display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #bbb; }
    .product-info { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .product-name { font-size: 14px; color: var(--brand-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .product-meta { font-size: 12px; color: var(--brand-text-secondary); }
    .product-qty { font-size: 13px; font-weight: 600; color: var(--brand-pink); white-space: nowrap; }

    .status-badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 10px; }
    .st-pending { background: #f8ebcf; color: #8a6d1a; }
    .st-paid { background: #dbe7ff; color: #2f5bbd; }
    .st-preparing { background: var(--brand-lavender-light); color: #7a4f63; }
    .st-shipping { background: var(--brand-pink-light); color: #a23a4d; }
    .st-delivered { background: #dcefe4; color: #2f7d52; }
    .st-cancelled { background: #eeeeee; color: #777; }
    .dot.st-pending { background: #d7b77a; } .dot.st-paid { background: #5b8def; }
    .dot.st-preparing { background: var(--brand-lavender); } .dot.st-shipping { background: var(--brand-pink); }
    .dot.st-delivered { background: #6ab187; } .dot.st-cancelled { background: #bdbdbd; }

    .quick { padding: 18px; border-radius: 16px; }
    .quick-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 12px; }
    .quick-item { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 18px; border-radius: 12px; text-decoration: none; color: var(--brand-text-primary); background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); transition: all .15s; }
    .quick-item:hover { border-color: var(--brand-pink); background: var(--brand-pink-light); }
    .quick-item mat-icon { color: var(--brand-pink); }

    .empty { color: #777; padding: 12px 0; }
    .error { color: var(--mat-sys-error); }
  `]
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  private service = inject(DashboardService);
  private reports = inject(ReportService);
  private orders = inject(OrderService);
  auth = inject(AuthService);
  upload = inject(UploadService);

  @ViewChild('revenueCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  data = signal<DashboardSummary | null>(null);
  recentOrders = signal<Order[]>([]);
  topProducts = signal<TopProduct[]>([]);
  revenueEmpty = signal(false);
  loading = signal(false);
  error = signal('');
  groupBy: 'day' | 'week' | 'month' = 'day';
  today = new Date();

  statusList: StatusMeta[] = [
    { key: 'pending', label: 'Chờ xử lý', cls: 'st-pending' },
    { key: 'paid', label: 'Đã thanh toán', cls: 'st-paid' },
    { key: 'preparing', label: 'Đang chuẩn bị', cls: 'st-preparing' },
    { key: 'shipping', label: 'Đang giao', cls: 'st-shipping' },
    { key: 'delivered', label: 'Đã giao', cls: 'st-delivered' },
    { key: 'cancelled', label: 'Đã hủy', cls: 'st-cancelled' }
  ];

  private chart?: Chart;
  private pendingRevenue: RevenuePoint[] | null = null;
  private viewReady = false;

  ngOnInit(): void {
    this.reload();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingRevenue) this.renderChart(this.pendingRevenue);
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.service.summary().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.message ?? 'Không tải được dữ liệu tổng quan'); }
    });
    this.loadRevenue();
    this.orders.list({ page: 1, limit: 5 }).subscribe({
      next: (res) => this.recentOrders.set(res.data),
      error: () => {}
    });
    this.reports.topProducts(5).subscribe({
      next: (res) => this.topProducts.set(res.data),
      error: () => {}
    });
  }

  loadRevenue(): void {
    this.reports.revenue({ groupBy: this.groupBy }).subscribe({
      next: (res) => {
        this.revenueEmpty.set(res.data.length === 0);
        if (this.viewReady) this.renderChart(res.data);
        else this.pendingRevenue = res.data;
      },
      error: () => {}
    });
  }

  private renderChart(points: RevenuePoint[]): void {
    this.pendingRevenue = null;
    if (!this.canvasRef) return;
    this.chart?.destroy();
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    let fill: CanvasGradient | string = 'rgba(232, 152, 154, 0.15)';
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, 'rgba(232, 152, 154, 0.35)');
      g.addColorStop(1, 'rgba(232, 152, 154, 0.02)');
      fill = g;
    }
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'line',
      data: {
        labels: points.map((p) => p.period),
        datasets: [{
          label: 'Doanh thu (₫)',
          data: points.map((p) => p.revenue),
          borderColor: '#e8989a',
          backgroundColor: fill,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#e8989a',
          pointRadius: points.length > 30 ? 0 : 3,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => `${Number(c.parsed.y).toLocaleString('vi-VN')} ₫` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v) => Number(v).toLocaleString('vi-VN') } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  customerName(o: Order): string {
    if (o.user_id && typeof o.user_id === 'object') return o.user_id.full_name;
    return 'Khách vãng lai';
  }

  statusLabel(s: OrderStatus): string {
    return this.statusList.find((x) => x.key === s)?.label ?? s;
  }

  statusCls(s: OrderStatus): string {
    return this.statusList.find((x) => x.key === s)?.cls ?? '';
  }
}
