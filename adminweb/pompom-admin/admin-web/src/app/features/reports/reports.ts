import {
  Component, inject, signal, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Chart, registerables } from 'chart.js';
import { RevenuePoint, TopProduct, UserBehaviorReport } from '../../core/models/models';
import { ReportService } from '../../core/services/report.service';
import { UploadService } from '../../core/services/upload.service';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  imports: [
    DecimalPipe, FormsModule,
    MatCardModule, MatIconModule, MatTableModule, MatButtonToggleModule, MatProgressBarModule
  ],
  template: `
    <h1>Thống kê &amp; báo cáo</h1>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    @if (error()) { <p class="error">{{ error() }}</p> }

    <!-- Hành vi người dùng -->
    @if (behavior(); as b) {
      <div class="cards">
        <mat-card class="stat">
          <div class="icon views"><mat-icon>visibility</mat-icon></div>
          <div class="info">
            <span class="label">Lượt xem sản phẩm</span>
            <span class="value">{{ b.totalProductViews | number }}</span>
          </div>
        </mat-card>
        <mat-card class="stat">
          <div class="icon engaged"><mat-icon>groups</mat-icon></div>
          <div class="info">
            <span class="label">User có tương tác</span>
            <span class="value">{{ b.engagedUsers | number }}</span>
          </div>
        </mat-card>
        <mat-card class="stat">
          <div class="icon conv"><mat-icon>trending_up</mat-icon></div>
          <div class="info">
            <span class="label">Tỷ lệ chuyển đổi</span>
            <span class="value">{{ b.conversionRate | number:'1.0-2' }}</span>
            <span class="sub">{{ b.deliveredOrders }} đơn giao / {{ b.engagedUsers }} user</span>
          </div>
        </mat-card>
      </div>
    }

    <!-- Biểu đồ doanh thu -->
    <mat-card class="chart-card">
      <mat-card-header>
        <mat-card-title>Doanh thu theo thời gian</mat-card-title>
        <span class="spacer"></span>
        <mat-button-toggle-group [(ngModel)]="groupBy" (change)="loadRevenue()" hideSingleSelectionIndicator>
          <mat-button-toggle value="day">Ngày</mat-button-toggle>
          <mat-button-toggle value="week">Tuần</mat-button-toggle>
          <mat-button-toggle value="month">Tháng</mat-button-toggle>
        </mat-button-toggle-group>
      </mat-card-header>
      <mat-card-content>
        <div class="chart-wrap"><canvas #revenueCanvas></canvas></div>
        @if (revenueEmpty()) { <p class="empty">Chưa có dữ liệu doanh thu (đơn đã giao).</p> }
      </mat-card-content>
    </mat-card>

    <!-- Top sản phẩm bán chạy -->
    <mat-card class="table-card">
      <mat-card-header><mat-card-title>Sản phẩm bán chạy</mat-card-title></mat-card-header>
      <mat-card-content>
        <table mat-table [dataSource]="topProducts()" class="table">
          <ng-container matColumnDef="rank">
            <th mat-header-cell *matHeaderCellDef>#</th>
            <td mat-cell *matCellDef="let p; let i = index">{{ i + 1 }}</td>
          </ng-container>
          <ng-container matColumnDef="image">
            <th mat-header-cell *matHeaderCellDef>Ảnh</th>
            <td mat-cell *matCellDef="let p">
              @if (p.image_url) {
                <img class="thumb" [src]="upload.resolveUrl(p.image_url)" alt="{{ p.name }}" />
              } @else {
                <div class="thumb placeholder"><mat-icon>image_not_supported</mat-icon></div>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Tên sản phẩm</th>
            <td mat-cell *matCellDef="let p">{{ p.name }}</td>
          </ng-container>
          <ng-container matColumnDef="quantity">
            <th mat-header-cell *matHeaderCellDef>Đã bán</th>
            <td mat-cell *matCellDef="let p">{{ p.totalQuantity | number }}</td>
          </ng-container>
          <ng-container matColumnDef="revenue">
            <th mat-header-cell *matHeaderCellDef>Doanh thu</th>
            <td mat-cell *matCellDef="let p">{{ p.totalRevenue | number }} ₫</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
        @if (topProducts().length === 0 && !loading()) { <p class="empty">Chưa có dữ liệu.</p> }
      </mat-card-content>
    </mat-card>

    <!-- Từ khóa tìm kiếm phổ biến -->
    @if (behavior()?.topSearches?.length) {
      <mat-card class="table-card">
        <mat-card-header><mat-card-title>Từ khóa tìm kiếm phổ biến</mat-card-title></mat-card-header>
        <mat-card-content>
          <div class="chips">
            @for (s of behavior()!.topSearches; track s.keyword) {
              <span class="chip">{{ s.keyword }} <b>{{ s.count }}</b></span>
            }
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin: 16px 0; }
    .stat { display: flex; align-items: center; gap: 16px; padding: 16px; }
    .icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
    .icon mat-icon { color: #fff; font-size: 28px; width: 28px; height: 28px; }
    .icon.views { background: var(--brand-lavender); }
    .icon.engaged { background: var(--brand-gold); }
    .icon.conv { background: var(--brand-pink); }
    .info { display: flex; flex-direction: column; }
    .label { font-size: 13px; color: var(--brand-text-secondary); }
    .value { font-size: 24px; font-weight: 700; color: var(--brand-text-primary); }
    .sub { font-size: 12px; color: var(--brand-text-secondary); }
    .chart-card, .table-card { margin-bottom: 16px; }
    mat-card-header { display: flex; align-items: center; }
    .spacer { flex: 1 1 auto; }
    .chart-wrap { position: relative; height: 320px; }
    .table { width: 100%; }
    .thumb { width: 44px; height: 44px; border-radius: 6px; object-fit: cover; display: block; }
    .thumb.placeholder { display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #bbb; }
    .chips { display: flex; flex-wrap: wrap; gap: 10px; }
    .chip { background: var(--brand-lavender-light); color: var(--brand-text-primary); padding: 6px 14px; border-radius: 16px; font-size: 14px; }
    .chip b { color: var(--brand-pink); margin-left: 4px; }
    .empty { color: #777; padding: 12px 0; }
    .error { color: var(--mat-sys-error); }
  `]
})
export class Reports implements OnInit, AfterViewInit, OnDestroy {
  private service = inject(ReportService);
  upload = inject(UploadService);

  @ViewChild('revenueCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  topProducts = signal<TopProduct[]>([]);
  behavior = signal<UserBehaviorReport | null>(null);
  revenueEmpty = signal(false);
  loading = signal(false);
  error = signal('');
  groupBy: 'day' | 'week' | 'month' = 'month';

  cols = ['rank', 'image', 'name', 'quantity', 'revenue'];

  private chart?: Chart;
  private pendingRevenue: RevenuePoint[] | null = null;
  private viewReady = false;

  ngOnInit(): void {
    this.loading.set(true);
    this.loadRevenue();
    this.service.topProducts(10).subscribe({
      next: (res) => this.topProducts.set(res.data),
      error: (err) => this.error.set(err?.error?.message ?? 'Không tải được báo cáo')
    });
    this.service.userBehavior().subscribe({
      next: (b) => this.behavior.set(b),
      error: (err) => this.error.set(err?.error?.message ?? 'Không tải được báo cáo')
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingRevenue) this.renderChart(this.pendingRevenue);
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  loadRevenue(): void {
    this.service.revenue({ groupBy: this.groupBy }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.revenueEmpty.set(res.data.length === 0);
        if (this.viewReady) this.renderChart(res.data);
        else this.pendingRevenue = res.data;
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Không tải được báo cáo doanh thu');
      }
    });
  }

  private renderChart(points: RevenuePoint[]): void {
    this.pendingRevenue = null;
    if (!this.canvasRef) return;
    this.chart?.destroy();
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'line',
      data: {
        labels: points.map((p) => p.period),
        datasets: [{
          label: 'Doanh thu (₫)',
          data: points.map((p) => p.revenue),
          borderColor: '#e8989a',
          backgroundColor: 'rgba(232, 152, 154, 0.15)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#e8989a'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${Number(ctx.parsed.y).toLocaleString('vi-VN')} ₫`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => Number(v).toLocaleString('vi-VN') }
          }
        }
      }
    });
  }
}
