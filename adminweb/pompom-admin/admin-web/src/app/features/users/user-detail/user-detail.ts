import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserDetail as UserDetailModel } from '../../../core/models/models';
import { UserService } from '../../../core/services/user.service';
import { ORDER_STATUS_LABELS } from '../../orders/order-status';

@Component({
  selector: 'app-user-detail',
  imports: [
    RouterLink, FormsModule, DatePipe, DecimalPipe,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatChipsModule, MatListModule, MatDividerModule, MatProgressBarModule
  ],
  template: `
    <div class="header">
      <button mat-icon-button routerLink="/users"><mat-icon>arrow_back</mat-icon></button>
      <h1>Chi tiết người dùng</h1>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    @if (user(); as u) {
      <div class="grid">
        <mat-card>
          <mat-card-header><mat-card-title>{{ u.full_name }}</mat-card-title>
            <mat-card-subtitle>{{ u.email }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p><b>SĐT:</b> {{ u.phone_number || '—' }}</p>
            <p><b>Vai trò:</b> {{ u.role }}</p>
            <p><b>Trạng thái:</b>
              <mat-chip [highlighted]="u.status === 'active'" [color]="u.status === 'active' ? 'primary' : 'warn'">
                {{ u.status === 'active' ? 'Hoạt động' : 'Đã khóa' }}
              </mat-chip>
            </p>
            <p><b>Ngày tham gia:</b> {{ u.join_date | date:'dd/MM/yyyy' }}</p>
            <mat-divider class="my"></mat-divider>
            @if (u.role !== 'admin') {
              @if (u.status === 'active') {
                <button mat-flat-button color="warn" (click)="setStatus('locked')" [disabled]="saving()">
                  <mat-icon>lock</mat-icon> Khóa tài khoản
                </button>
              } @else {
                <button mat-flat-button color="primary" (click)="setStatus('active')" [disabled]="saving()">
                  <mat-icon>lock_open</mat-icon> Mở khóa
                </button>
              }
            } @else {
              <p class="muted">Không thể khóa tài khoản admin.</p>
            }
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title>Gửi thông báo</mat-card-title></mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Tiêu đề</mat-label>
              <input matInput [(ngModel)]="notifTitle" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Nội dung</mat-label>
              <textarea matInput rows="3" [(ngModel)]="notifMessage"></textarea>
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="sendNotif()" [disabled]="!notifTitle || saving()">
              <mat-icon>send</mat-icon> Gửi
            </button>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="mt">
        <mat-card-header><mat-card-title>Địa chỉ ({{ u.addresses.length }})</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (u.addresses.length === 0) { <p class="muted">Chưa có địa chỉ.</p> }
          <mat-list>
            @for (a of u.addresses; track a._id) {
              <mat-list-item>
                {{ a.recipient_name }} ({{ a.phone }}) — {{ a.address_line }}@if (a.ward) {, {{ a.ward }}}@if (a.district) {, {{ a.district }}}@if (a.city) {, {{ a.city }}}
                @if (a.is_default) { <mat-chip highlighted>Mặc định</mat-chip> }
              </mat-list-item>
            }
          </mat-list>
        </mat-card-content>
      </mat-card>

      <mat-card class="mt">
        <mat-card-header><mat-card-title>Lịch sử đơn hàng ({{ u.orders.length }})</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (u.orders.length === 0) { <p class="muted">Chưa có đơn hàng.</p> }
          @for (o of u.orders; track o._id) {
            <p>
              <a [routerLink]="['/orders', o._id]">{{ o.order_number }}</a>
              — {{ statusLabel(o.status) }} — {{ o.final_amount | number }} ₫
              <span class="muted">({{ o.created_at | date:'dd/MM/yyyy' }})</span>
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
    .muted { color: #777; }
  `]
})
export class UserDetail implements OnInit {
  private service = inject(UserService);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  user = signal<UserDetailModel | null>(null);
  loading = signal(false);
  saving = signal(false);
  notifTitle = '';
  notifMessage = '';
  private id = '';

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getById(this.id).subscribe({
      next: (u) => {
        this.user.set(u);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setStatus(status: 'active' | 'locked'): void {
    this.saving.set(true);
    this.service.updateStatus(this.id, status).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.snack.open(res.message, 'OK', { duration: 2500 });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 });
      }
    });
  }

  sendNotif(): void {
    if (!this.notifTitle) return;
    this.saving.set(true);
    this.service.sendNotification(this.id, { title: this.notifTitle, message: this.notifMessage }).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.notifTitle = '';
        this.notifMessage = '';
        this.snack.open(res.message, 'OK', { duration: 2500 });
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
}
