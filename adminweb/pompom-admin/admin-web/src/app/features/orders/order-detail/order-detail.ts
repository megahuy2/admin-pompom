import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrderDetail as OrderDetailModel, OrderItem, OrderStatus } from '../../../core/models/models';
import { OrderService } from '../../../core/services/order.service';
import { ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS, TERMINAL_STATUSES } from '../order-status';

@Component({
  selector: 'app-order-detail',
  imports: [
    RouterLink, FormsModule, DatePipe, DecimalPipe,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTableModule, MatChipsModule, MatDividerModule, MatProgressBarModule
  ],
  template: `
    <div class="header">
      <button mat-icon-button routerLink="/orders"><mat-icon>arrow_back</mat-icon></button>
      <h1>Chi tiết đơn hàng</h1>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    @if (order(); as o) {
      <div class="grid">
        <mat-card>
          <mat-card-header><mat-card-title>{{ o.order_number }}</mat-card-title>
            <mat-card-subtitle>{{ o.created_at | date:'dd/MM/yyyy HH:mm' }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p><b>Khách hàng:</b> {{ customerName() }}</p>
            <p><b>Trạng thái:</b> <mat-chip highlighted>{{ statusLabel(o.status) }}</mat-chip></p>
            <p><b>Thanh toán:</b> {{ o.payment_method }} — {{ o.payment_status }}</p>
            <mat-divider></mat-divider>
            <p><b>Tạm tính:</b> {{ o.total_amount | number }} ₫</p>
            <p><b>Phí ship:</b> {{ o.shipping_fee | number }} ₫</p>
            <p><b>Giảm giá:</b> {{ o.discount_amount | number }} ₫</p>
            <p class="total"><b>Thành tiền:</b> {{ o.final_amount | number }} ₫</p>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title>Cập nhật</mat-card-title></mat-card-header>
          <mat-card-content>
            @if (isTerminal()) {
              <p class="muted">Đơn đã ở trạng thái cuối, không thể đổi tiếp.</p>
            } @else {
              <mat-form-field appearance="outline" class="full">
                <mat-label>Trạng thái mới</mat-label>
                <mat-select [(ngModel)]="newStatus">
                  @for (s of statusOptions; track s.value) {
                    <mat-option [value]="s.value">{{ s.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Ghi chú</mat-label>
                <input matInput [(ngModel)]="note" />
              </mat-form-field>
              <button mat-flat-button color="primary" (click)="changeStatus()" [disabled]="!newStatus || saving()">
                Đổi trạng thái
              </button>
            }

            @if (o.payment_method === 'COD' && o.payment_status !== 'paid') {
              <mat-divider class="my"></mat-divider>
              <button mat-stroked-button color="primary" (click)="confirmPayment()" [disabled]="saving()">
                <mat-icon>payments</mat-icon> Xác nhận đã thu tiền COD
              </button>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="mt">
        <mat-card-header><mat-card-title>Sản phẩm</mat-card-title></mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="o.items" class="full">
            <ng-container matColumnDef="product">
              <th mat-header-cell *matHeaderCellDef>Sản phẩm</th>
              <td mat-cell *matCellDef="let it">{{ productName(it) }}</td>
            </ng-container>
            <ng-container matColumnDef="quantity">
              <th mat-header-cell *matHeaderCellDef>SL</th>
              <td mat-cell *matCellDef="let it">{{ it.quantity }}</td>
            </ng-container>
            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef>Đơn giá</th>
              <td mat-cell *matCellDef="let it">{{ it.price | number }} ₫</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="itemCols"></tr>
            <tr mat-row *matRowDef="let row; columns: itemCols;"></tr>
          </table>
        </mat-card-content>
      </mat-card>

      <mat-card class="mt">
        <mat-card-header><mat-card-title>Lịch sử trạng thái</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (o.history.length === 0) { <p class="muted">Chưa có lịch sử.</p> }
          @for (h of o.history; track h._id) {
            <p>{{ h.created_at | date:'dd/MM/yyyy HH:mm' }} — <b>{{ statusLabel(h.status) }}</b>
              @if (h.note) { <span>· {{ h.note }}</span> }
            </p>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .header { display: flex; align-items: center; gap: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full { width: 100%; }
    .mt { margin-top: 16px; }
    .my { margin: 16px 0; }
    .total { font-size: 16px; }
    .muted { color: #777; }
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
  itemCols = ['product', 'quantity', 'price'];

  isTerminal = computed(() => {
    const o = this.order();
    return o ? TERMINAL_STATUSES.includes(o.status) : false;
  });

  private id = '';

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getById(this.id).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  changeStatus(): void {
    if (!this.newStatus) return;
    this.saving.set(true);
    this.service.updateStatus(this.id, this.newStatus, this.note).subscribe({
      next: () => {
        this.saving.set(false);
        this.note = '';
        this.newStatus = '';
        this.snack.open('Đã đổi trạng thái', 'OK', { duration: 2500 });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 });
      }
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
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 });
      }
    });
  }

  statusLabel(s: string): string {
    return ORDER_STATUS_LABELS[s] ?? s;
  }

  customerName(): string {
    const o = this.order();
    if (o?.user_id && typeof o.user_id === 'object') return o.user_id.full_name;
    return 'Khách vãng lai';
  }

  productName(it: OrderItem): string {
    if (it.product_id && typeof it.product_id === 'object') return it.product_id.name;
    return '(sản phẩm)';
  }
}
