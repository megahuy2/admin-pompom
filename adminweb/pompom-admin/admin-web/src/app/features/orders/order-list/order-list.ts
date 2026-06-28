import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Order } from '../../../core/models/models';
import { OrderService } from '../../../core/services/order.service';
import { ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS } from '../order-status';

@Component({
  selector: 'app-order-list',
  imports: [
    RouterLink, FormsModule, DatePipe, DecimalPipe,
    MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatChipsModule, MatPaginatorModule, MatProgressBarModule
  ],
  template: `
    <h1>Đơn hàng</h1>

    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>Mã đơn</mat-label>
        <input matInput [(ngModel)]="search" (keyup.enter)="applyFilter()" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Trạng thái</mat-label>
        <mat-select [(ngModel)]="status" (selectionChange)="applyFilter()">
          <mat-option [value]="''">Tất cả</mat-option>
          @for (s of statusOptions; track s.value) {
            <mat-option [value]="s.value">{{ s.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Từ ngày</mat-label>
        <input matInput type="date" [(ngModel)]="from" (change)="applyFilter()" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Đến ngày</mat-label>
        <input matInput type="date" [(ngModel)]="to" (change)="applyFilter()" />
      </mat-form-field>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    <table mat-table [dataSource]="orders()" class="mat-elevation-z1 table">
      <ng-container matColumnDef="order_number">
        <th mat-header-cell *matHeaderCellDef>Mã đơn</th>
        <td mat-cell *matCellDef="let o">{{ o.order_number }}</td>
      </ng-container>
      <ng-container matColumnDef="customer">
        <th mat-header-cell *matHeaderCellDef>Khách hàng</th>
        <td mat-cell *matCellDef="let o">{{ customerName(o) }}</td>
      </ng-container>
      <ng-container matColumnDef="final_amount">
        <th mat-header-cell *matHeaderCellDef>Tổng tiền</th>
        <td mat-cell *matCellDef="let o">{{ o.final_amount | number }} ₫</td>
      </ng-container>
      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
        <td mat-cell *matCellDef="let o"><mat-chip highlighted>{{ statusLabel(o.status) }}</mat-chip></td>
      </ng-container>
      <ng-container matColumnDef="payment">
        <th mat-header-cell *matHeaderCellDef>Thanh toán</th>
        <td mat-cell *matCellDef="let o">{{ o.payment_method }} · {{ o.payment_status }}</td>
      </ng-container>
      <ng-container matColumnDef="created_at">
        <th mat-header-cell *matHeaderCellDef>Ngày tạo</th>
        <td mat-cell *matCellDef="let o">{{ o.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let o">
          <button mat-icon-button [routerLink]="['/orders', o._id]" title="Chi tiết"><mat-icon>visibility</mat-icon></button>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns;"></tr>
    </table>

    @if (!loading() && orders().length === 0) { <p class="empty">Không có đơn hàng nào.</p> }

    <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page() - 1"
      [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
  `,
  styles: [`
    .filters { display: flex; gap: 12px; align-items: center; margin: 12px 0; flex-wrap: wrap; }
    .table { width: 100%; }
    .empty { text-align: center; color: #777; padding: 24px; }
  `]
})
export class OrderList implements OnInit {
  private service = inject(OrderService);

  orders = signal<Order[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  limit = 20;

  search = '';
  status = '';
  from = '';
  to = '';
  statusOptions = ORDER_STATUS_OPTIONS;
  columns = ['order_number', 'customer', 'final_amount', 'status', 'payment', 'created_at', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list({ page: this.page(), limit: this.limit, search: this.search, status: this.status, from: this.from, to: this.to })
      .subscribe({
        next: (res) => {
          this.orders.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  applyFilter(): void {
    this.page.set(1);
    this.load();
  }

  onPage(e: PageEvent): void {
    this.limit = e.pageSize;
    this.page.set(e.pageIndex + 1);
    this.load();
  }

  statusLabel(s: string): string {
    return ORDER_STATUS_LABELS[s] ?? s;
  }

  customerName(o: Order): string {
    if (o.user_id && typeof o.user_id === 'object') return o.user_id.full_name;
    return 'Khách vãng lai';
  }
}
