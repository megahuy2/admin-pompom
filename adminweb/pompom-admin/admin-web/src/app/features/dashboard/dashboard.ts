import {
  Component, inject, signal, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef
} from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import {
  DashboardSummary, Order, OrderStatus, RevenuePoint, TopProduct, TopCustomer
} from '../../core/models/models';
import { DashboardService } from '../../core/services/dashboard.service';
import { ReportService } from '../../core/services/report.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';

Chart.register(...registerables);

interface StatusMeta { key: OrderStatus; label: string; cls: string; icon: string; }

@Component({
  selector: 'app-dashboard',
  imports: [
    DecimalPipe, DatePipe, RouterLink, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatButtonToggleModule, MatTooltipModule
  ],
  template: `
    <!-- ========================= TOP BAR ========================= -->
    <div class="topbar">
      <div class="hello">
        <h1>Xin chào, {{ auth.currentUser()?.full_name || 'Admin' }} 👋</h1>
        <p class="clock">
          <mat-icon>schedule</mat-icon>
          {{ now() | date:'EEEE, dd/MM/yyyy · HH:mm:ss' }}
        </p>
      </div>
      <div class="top-actions">
        <div class="quick-search">
          <mat-icon>search</mat-icon>
          <input
            [(ngModel)]="searchTerm"
            (keyup.enter)="quickSearch()"
            placeholder="Tìm đơn hàng, mã đơn…" />
        </div>
        <button mat-icon-button class="bell" matTooltip="Đơn chờ xử lý"
                routerLink="/orders" [queryParams]="{ status: 'pending' }">
          <mat-icon>notifications</mat-icon>
          @if (pendingCount() > 0) { <span class="bell-badge">{{ pendingCount() }}</span> }
        </button>
        <button mat-flat-button class="refresh-btn" (click)="reload()" [disabled]="loading()">
          <mat-icon>refresh</mat-icon> Làm mới
        </button>
      </div>
    </div>

    @if (error()) { <p class="error">{{ error() }}</p> }

    <!-- ========================= ROW 1: KPI ========================= -->
    @if (loading() && !data()) {
      <div class="cards">
        @for (i of [1,2,3,4]; track i) { <div class="stat skeleton-card"></div> }
      </div>
    } @else if (data(); as d) {
      <div class="cards">
        <div class="stat accent-pink">
          <div class="stat-top">
            <div class="icon"><mat-icon>payments</mat-icon></div>
            <span class="badge">Đã giao</span>
          </div>
          <span class="value">{{ d.totalRevenue | number }} ₫</span>
          <span class="label">Tổng doanh thu</span>
          <span class="sub"><mat-icon>today</mat-icon> Hôm nay: {{ d.todayRevenue | number }} ₫</span>
        </div>

        <div class="stat accent-lavender">
          <div class="stat-top">
            <div class="icon"><mat-icon>receipt_long</mat-icon></div>
            <span class="badge">{{ d.todayOrders }} hôm nay</span>
          </div>
          <span class="value">{{ d.totalOrders | number }}</span>
          <span class="label">Tổng đơn hàng</span>
          <span class="sub"><mat-icon>check_circle</mat-icon> {{ d.ordersByStatus.delivered | number }} đã giao</span>
        </div>

        <div class="stat accent-gold">
          <div class="stat-top">
            <div class="icon"><mat-icon>group</mat-icon></div>
            <span class="badge">+{{ d.newUsersLast30Days }}</span>
          </div>
          <span class="value">{{ d.totalUsers | number }}</span>
          <span class="label">Tổng khách hàng</span>
          <span class="sub"><mat-icon>person_add</mat-icon> {{ d.newUsersLast30Days }} mới trong 30 ngày</span>
        </div>

        <div class="stat accent-green">
          <div class="stat-top">
            <div class="icon"><mat-icon>inventory_2</mat-icon></div>
            <span class="badge">Đang bán</span>
          </div>
          <span class="value">{{ d.totalProducts | number }}</span>
          <span class="label">Tổng sản phẩm</span>
          <span class="sub"><mat-icon>storefront</mat-icon> Sản phẩm đang kinh doanh</span>
        </div>
      </div>

      <!-- ===================== ROW 2: ORDER STATUS ===================== -->
      <div class="status-strip">
        @for (s of statusList; track s.key) {
          <a class="status-pill {{ s.cls }}" routerLink="/orders" [queryParams]="{ status: s.key }">
            <div class="status-ic"><mat-icon>{{ s.icon }}</mat-icon></div>
            <div class="status-body">
              <span class="status-count">{{ d.ordersByStatus[s.key] | number }}</span>
              <span class="status-label">{{ s.label }}</span>
            </div>
          </a>
        }
      </div>
    }

    <!-- ===================== ROW 3: CHARTS ===================== -->
    <div class="charts-row">
      <mat-card class="chart-card">
        <div class="card-head">
          <div>
            <span class="card-title">Biểu đồ doanh thu</span>
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

      <mat-card class="chart-card">
        <div class="card-head">
          <div>
            <span class="card-title">Biểu đồ đơn hàng</span>
            <span class="card-sub">Số đơn theo thời gian</span>
          </div>
        </div>
        <div class="chart-wrap"><canvas #ordersCanvas></canvas></div>
        @if (revenueEmpty()) { <p class="empty">Chưa có dữ liệu đơn hàng.</p> }
      </mat-card>
    </div>

    <!-- ===================== ROW 4: TOP LISTS ===================== -->
    <div class="three-col">
      <!-- Top sản phẩm bán chạy -->
      <mat-card class="panel">
        <div class="card-head">
          <span class="card-title">Top sản phẩm bán chạy</span>
          <a mat-button routerLink="/reports">Chi tiết</a>
        </div>
        @if (loading() && topProducts().length === 0) {
          @for (i of [1,2,3,4,5]; track i) { <div class="skeleton-row"></div> }
        }
        @if (topProducts().length === 0 && !loading()) { <p class="empty">Chưa có dữ liệu.</p> }
        @for (p of topProducts(); track p.productId; let i = $index) {
          <div class="rank-row">
            <span class="rank rank-{{ i + 1 }}">{{ i + 1 }}</span>
            @if (p.image_url) {
              <img class="thumb" [src]="upload.resolveUrl(p.image_url)" alt="{{ p.name }}" />
            } @else {
              <div class="thumb placeholder"><mat-icon>image</mat-icon></div>
            }
            <div class="rank-info">
              <span class="rank-name">{{ p.name }}</span>
              <span class="rank-meta">{{ p.totalRevenue | number }} ₫</span>
            </div>
            <span class="rank-qty">{{ p.totalQuantity | number }} đã bán</span>
          </div>
        }
      </mat-card>

      <!-- Top khách hàng -->
      <mat-card class="panel">
        <div class="card-head">
          <span class="card-title">Top khách hàng</span>
          <a mat-button routerLink="/users">Tất cả</a>
        </div>
        @if (loading() && topCustomers().length === 0) {
          @for (i of [1,2,3,4,5]; track i) { <div class="skeleton-row"></div> }
        }
        @if (topCustomers().length === 0 && !loading()) { <p class="empty">Chưa có dữ liệu.</p> }
        @for (c of topCustomers(); track c.userId; let i = $index) {
          <a class="rank-row" [routerLink]="['/users', c.userId]">
            <span class="rank rank-{{ i + 1 }}">{{ i + 1 }}</span>
            @if (c.avatar_url) {
              <img class="thumb round" [src]="c.avatar_url" alt="{{ c.full_name }}" />
            } @else {
              <div class="thumb round placeholder"><mat-icon>person</mat-icon></div>
            }
            <div class="rank-info">
              <span class="rank-name">{{ c.full_name }}</span>
              <span class="rank-meta">{{ c.orderCount }} đơn hàng</span>
            </div>
            <span class="rank-qty">{{ c.totalSpent | number }} ₫</span>
          </a>
        }
      </mat-card>

      <!-- Đơn hàng gần đây -->
      <mat-card class="panel">
        <div class="card-head">
          <span class="card-title">Đơn hàng gần đây</span>
          <a mat-button routerLink="/orders">Xem tất cả</a>
        </div>
        @if (loading() && recentOrders().length === 0) {
          @for (i of [1,2,3,4,5]; track i) { <div class="skeleton-row"></div> }
        }
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
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ---------- TOP BAR ---------- */
    .topbar {
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 16px; margin-bottom: 20px;
    }
    .hello h1 { margin: 0 0 4px; font-size: 24px; }
    .clock { display: flex; align-items: center; gap: 6px; margin: 0; color: var(--brand-text-secondary); text-transform: capitalize; font-size: 13px; }
    .clock mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .top-actions { display: flex; align-items: center; gap: 10px; }
    .quick-search {
      display: flex; align-items: center; gap: 8px; background: var(--mat-sys-surface);
      border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 8px 14px;
      transition: border-color .2s, box-shadow .2s; min-width: 240px;
    }
    .quick-search:focus-within { border-color: var(--brand-pink); box-shadow: 0 0 0 3px var(--brand-pink-light); }
    .quick-search mat-icon { color: var(--brand-text-secondary); font-size: 20px; }
    .quick-search input { border: none; outline: none; background: transparent; font-size: 14px; width: 100%; color: var(--brand-text-primary); }
    .bell { position: relative; }
    .bell-badge {
      position: absolute; top: 4px; right: 4px; min-width: 16px; height: 16px; padding: 0 4px;
      background: var(--brand-pink); color: #fff; font-size: 10px; font-weight: 700;
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
    }
    .refresh-btn { background: var(--brand-pink); color: #fff; border-radius: 10px; }

    /* ---------- ROW 1: KPI ---------- */
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .stat {
      padding: 18px; border-radius: 16px; display: flex; flex-direction: column;
      position: relative; overflow: hidden; background: var(--mat-sys-surface);
      border: 1px solid var(--mat-sys-outline-variant);
      transition: transform .18s ease, box-shadow .18s ease;
      animation: rise .3s ease both;
    }
    .stat:hover { transform: translateY(-3px); box-shadow: 0 10px 26px rgba(232, 152, 154, 0.22); }
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

    /* ---------- ROW 2: STATUS ---------- */
    .status-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 18px; }
    .status-pill {
      display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 12px;
      background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant);
      text-decoration: none; transition: transform .15s, box-shadow .15s, border-color .15s;
    }
    .status-pill:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,.08); }
    .status-ic { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
    .status-ic mat-icon { font-size: 19px; width: 19px; height: 19px; }
    .status-body { display: flex; flex-direction: column; }
    .status-count { font-size: 19px; font-weight: 700; color: var(--brand-text-primary); line-height: 1.1; }
    .status-label { font-size: 12px; color: var(--brand-text-secondary); }
    /* status colors */
    .st-pending .status-ic { background: #f8ebcf; color: #8a6d1a; }
    .st-paid .status-ic { background: #dbe7ff; color: #2f5bbd; }
    .st-preparing .status-ic { background: var(--brand-lavender-light); color: #7a4f63; }
    .st-shipping .status-ic { background: var(--brand-pink-light); color: #a23a4d; }
    .st-delivered .status-ic { background: #dcefe4; color: #2f7d52; }
    .st-returned .status-ic { background: #fde3cf; color: #b5591a; }
    .st-cancelled .status-ic { background: #eeeeee; color: #777; }

    /* ---------- ROW 3: CHARTS ---------- */
    .charts-row { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; margin-bottom: 18px; }
    @media (max-width: 1000px) { .charts-row { grid-template-columns: 1fr; } }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px; }
    .card-title { font-size: 16px; font-weight: 600; color: var(--brand-text-primary); }
    .card-sub { display: block; font-size: 12px; color: var(--brand-text-secondary); }
    .chart-card { padding: 18px; border-radius: 16px; }
    .chart-wrap { position: relative; height: 300px; }

    /* ---------- ROW 4: TOP LISTS ---------- */
    .three-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
    @media (max-width: 1100px) { .three-col { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 720px) { .three-col { grid-template-columns: 1fr; } }
    .panel { padding: 18px; border-radius: 16px; }

    .rank-row, .order-row {
      display: flex; align-items: center; gap: 12px; padding: 9px 8px; border-radius: 10px;
      text-decoration: none; transition: background .15s;
    }
    .rank-row:hover, .order-row:hover { background: var(--mat-sys-surface-variant); }
    .rank { width: 24px; height: 24px; border-radius: 50%; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; background: var(--brand-pink-light); color: var(--brand-pink); }
    .rank-1 { background: #ffe6a0; color: #a06a00; } .rank-2 { background: #e6e6e6; color: #777; } .rank-3 { background: #f6d5c0; color: #a4571f; }
    .thumb { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; flex: 0 0 auto; }
    .thumb.round { border-radius: 50%; }
    .thumb.placeholder { display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #bbb; }
    .rank-info { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .rank-name { font-size: 14px; color: var(--brand-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rank-meta { font-size: 12px; color: var(--brand-text-secondary); }
    .rank-qty { font-size: 13px; font-weight: 600; color: var(--brand-pink); white-space: nowrap; }

    .order-main { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .order-num { font-weight: 600; color: var(--brand-text-primary); font-size: 14px; }
    .order-cust { font-size: 12px; color: var(--brand-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .order-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .order-amount { font-weight: 600; color: var(--brand-text-primary); font-size: 14px; }
    .status-badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 10px; white-space: nowrap; }
    .st-pending { background: #f8ebcf; color: #8a6d1a; }
    .st-paid { background: #dbe7ff; color: #2f5bbd; }
    .st-preparing { background: var(--brand-lavender-light); color: #7a4f63; }
    .st-shipping { background: var(--brand-pink-light); color: #a23a4d; }
    .st-delivered { background: #dcefe4; color: #2f7d52; }
    .st-returned { background: #fde3cf; color: #b5591a; }
    .st-cancelled { background: #eeeeee; color: #777; }

    /* ---------- SKELETON ---------- */
    .skeleton-card { min-height: 132px; }
    .skeleton-card, .skeleton-row {
      background: linear-gradient(90deg, #f4e4e4 25%, #faf0f0 37%, #f4e4e4 63%);
      background-size: 400% 100%; animation: shimmer 1.4s ease infinite; border-radius: 12px;
    }
    .skeleton-row { height: 44px; margin-bottom: 10px; }
    @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    .empty { color: #777; padding: 12px 0; }
    .error { color: var(--mat-sys-error); }
  `]
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  private service = inject(DashboardService);
  private reports = inject(ReportService);
  private orders = inject(OrderService);
  private router = inject(Router);
  auth = inject(AuthService);
  upload = inject(UploadService);

  @ViewChild('revenueCanvas') revenueRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersCanvas') ordersRef!: ElementRef<HTMLCanvasElement>;

  data = signal<DashboardSummary | null>(null);
  recentOrders = signal<Order[]>([]);
  topProducts = signal<TopProduct[]>([]);
  topCustomers = signal<TopCustomer[]>([]);
  revenueEmpty = signal(false);
  loading = signal(false);
  error = signal('');
  now = signal(new Date());
  groupBy: 'day' | 'week' | 'month' = 'day';
  searchTerm = '';

  pendingCount = signal(0);

  statusList: StatusMeta[] = [
    { key: 'pending', label: 'Chờ xử lý', cls: 'st-pending', icon: 'hourglass_empty' },
    { key: 'paid', label: 'Đã thanh toán', cls: 'st-paid', icon: 'paid' },
    { key: 'preparing', label: 'Đang chuẩn bị', cls: 'st-preparing', icon: 'inventory' },
    { key: 'shipping', label: 'Đang giao', cls: 'st-shipping', icon: 'local_shipping' },
    { key: 'delivered', label: 'Đã giao', cls: 'st-delivered', icon: 'task_alt' },
    { key: 'returned', label: 'Hoàn hàng', cls: 'st-returned', icon: 'assignment_return' },
    { key: 'cancelled', label: 'Đã hủy', cls: 'st-cancelled', icon: 'cancel' }
  ];

  private revenueChart?: Chart;
  private ordersChart?: Chart;
  private revenuePoints: RevenuePoint[] = [];
  private clockTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.reload();
    this.clockTimer = setInterval(() => this.now.set(new Date()), 1000);
  }

  ngAfterViewInit(): void {
    // Nếu dữ liệu doanh thu đã về trước khi view sẵn sàng thì vẽ lại
    if (this.revenuePoints.length) setTimeout(() => this.renderCharts(this.revenuePoints), 0);
  }

  ngOnDestroy(): void {
    this.revenueChart?.destroy();
    this.ordersChart?.destroy();
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.service.summary().subscribe({
      next: (d) => {
        this.data.set(d);
        this.pendingCount.set(d.ordersByStatus.pending || 0);
        this.loading.set(false);
      },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.message ?? 'Không tải được dữ liệu tổng quan'); }
    });
    this.loadRevenue();
    this.orders.list({ page: 1, limit: 6 }).subscribe({
      next: (res) => this.recentOrders.set(res.data),
      error: () => {}
    });
    this.reports.topProducts(5).subscribe({
      next: (res) => this.topProducts.set(res.data),
      error: () => {}
    });
    this.reports.topCustomers(5).subscribe({
      next: (res) => this.topCustomers.set(res.data),
      error: () => {}
    });
  }

  loadRevenue(): void {
    this.reports.revenue({ groupBy: this.groupBy }).subscribe({
      next: (res) => {
        this.revenueEmpty.set(res.data.length === 0);
        this.revenuePoints = res.data;
        // Vẽ sau khi DOM ổn định (macrotask) — an toàn với mọi thứ tự lifecycle
        setTimeout(() => this.renderCharts(res.data), 0);
      },
      error: () => {}
    });
  }

  quickSearch(): void {
    const q = this.searchTerm.trim();
    this.router.navigate(['/orders'], { queryParams: q ? { search: q } : {} });
  }

  private renderCharts(points: RevenuePoint[]): void {
    const labels = points.map((p) => p.period);

    // --- Revenue (line) ---
    if (this.revenueRef) {
      this.revenueChart?.destroy();
      const ctx = this.revenueRef.nativeElement.getContext('2d');
      let fill: CanvasGradient | string = 'rgba(232, 152, 154, 0.15)';
      if (ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, 300);
        g.addColorStop(0, 'rgba(232, 152, 154, 0.35)');
        g.addColorStop(1, 'rgba(232, 152, 154, 0.02)');
        fill = g;
      }
      this.revenueChart = new Chart(this.revenueRef.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Doanh thu (₫)',
            data: points.map((p) => p.revenue),
            borderColor: '#e8989a', backgroundColor: fill, fill: true, tension: 0.35,
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

    // --- Orders (bar) ---
    if (this.ordersRef) {
      this.ordersChart?.destroy();
      this.ordersChart = new Chart(this.ordersRef.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Số đơn', data: points.map((p) => p.orders),
            backgroundColor: 'rgba(201, 164, 181, 0.65)', hoverBackgroundColor: '#c9a4b5',
            borderRadius: 6, maxBarThickness: 26
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.y} đơn` } } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } }
        }
      });
    }
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
