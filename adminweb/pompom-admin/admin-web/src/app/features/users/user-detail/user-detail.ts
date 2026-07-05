import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserDetail as UserDetailModel } from '../../../core/models/models';
import { UserService } from '../../../core/services/user.service';
import { ORDER_STATUS_LABELS, ORDER_STATUS_CLASS } from '../../orders/order-status';

@Component({
  selector: 'app-user-detail',
  imports: [
    RouterLink, FormsModule, DatePipe, DecimalPipe,
    MatButtonModule, MatIconModule, MatProgressBarModule
  ],
  template: `
    <div class="head">
      <button mat-icon-button routerLink="/users"><mat-icon>arrow_back</mat-icon></button>
      <h1>Chi tiết khách hàng</h1>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    @if (user(); as u) {
      <!-- Profile header -->
      <section class="card profile">
        @if (u.avatar_url) { <img class="avatar" [src]="u.avatar_url" alt="" /> }
        @else { <div class="avatar ph">{{ initials() }}</div> }
        <div class="pinfo">
          <div class="pname-row">
            <h2>{{ u.full_name }}</h2>
            <span class="badge" [class.on]="u.status === 'active'" [class.off]="u.status !== 'active'">
              {{ u.status === 'active' ? 'Hoạt động' : 'Đã khóa' }}</span>
            <span class="role" [class.admin]="u.role === 'admin'">{{ u.role === 'admin' ? 'Admin' : 'User' }}</span>
          </div>
          <p class="contact"><mat-icon>mail</mat-icon> {{ u.email }} @if (u.phone_number) { · <mat-icon>call</mat-icon> {{ u.phone_number }} }</p>
        </div>
        @if (u.role !== 'admin') {
          @if (u.status === 'active') {
            <button mat-stroked-button class="lock" (click)="setStatus('locked')" [disabled]="saving()"><mat-icon>lock</mat-icon> Khóa</button>
          } @else {
            <button mat-flat-button class="unlock" (click)="setStatus('active')" [disabled]="saving()"><mat-icon>lock_open</mat-icon> Mở khóa</button>
          }
        }
      </section>

      <!-- Stat cards -->
      <div class="stats">
        <div class="stat"><div class="ic pink"><mat-icon>receipt_long</mat-icon></div><div><span class="v">{{ u.orders.length }}</span><span class="l">Tổng đơn</span></div></div>
        <div class="stat"><div class="ic green"><mat-icon>payments</mat-icon></div><div><span class="v">{{ totalSpent() | number }} ₫</span><span class="l">Tổng chi tiêu</span></div></div>
        <div class="stat"><div class="ic gold"><mat-icon>place</mat-icon></div><div><span class="v">{{ u.addresses.length }}</span><span class="l">Địa chỉ</span></div></div>
        <div class="stat"><div class="ic lav"><mat-icon>event</mat-icon></div><div><span class="v">{{ u.join_date | date:'dd/MM/yyyy' }}</span><span class="l">Tham gia</span></div></div>
      </div>

      <div class="grid">
        <div class="col-main">
          <!-- Orders -->
          <section class="card">
            <h3>Lịch sử đơn hàng ({{ u.orders.length }})</h3>
            @if (u.orders.length === 0) { <p class="muted">Chưa có đơn hàng.</p> }
            @for (o of u.orders; track o._id) {
              <a class="order-row" [routerLink]="['/orders', o._id]">
                <span class="onum">{{ o.order_number }}</span>
                <span class="badge {{ cls(o.status) }}">{{ statusLabel(o.status) }}</span>
                <span class="oamt">{{ o.final_amount | number }} ₫</span>
                <span class="odate muted">{{ o.created_at | date:'dd/MM/yyyy' }}</span>
              </a>
            }
          </section>

          <!-- Addresses -->
          <section class="card">
            <h3>Địa chỉ ({{ u.addresses.length }})</h3>
            @if (u.addresses.length === 0) { <p class="muted">Chưa có địa chỉ.</p> }
            @for (a of u.addresses; track a._id) {
              <div class="addr">
                <mat-icon>place</mat-icon>
                <div>
                  <b>{{ a.recipient_name }} · {{ a.phone }}</b>
                  @if (a.is_default) { <span class="def">Mặc định</span> }
                  <p>{{ a.address_line }}@if (a.ward) {, {{ a.ward }}}@if (a.district) {, {{ a.district }}}@if (a.city) {, {{ a.city }}}</p>
                </div>
              </div>
            }
          </section>
        </div>

        <!-- Send notification -->
        <aside class="col-side">
          <section class="card">
            <h3>Gửi thông báo</h3>
            <label class="fld">Tiêu đề <input [(ngModel)]="notifTitle" placeholder="Tiêu đề thông báo" /></label>
            <label class="fld">Nội dung <textarea rows="4" [(ngModel)]="notifMessage" placeholder="Nội dung…"></textarea></label>
            <button mat-flat-button class="submit" (click)="sendNotif()" [disabled]="!notifTitle || saving()">
              <mat-icon>send</mat-icon> Gửi thông báo
            </button>
          </section>
        </aside>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .head { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; } .head h1 { margin: 0; }
    .card { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; padding: 18px; margin-bottom: 16px; }
    .card h3 { margin: 0 0 14px; font-size: 16px; }

    .profile { display: flex; align-items: center; gap: 16px; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; flex: 0 0 auto; }
    .avatar.ph { background: linear-gradient(135deg, var(--brand-pink), var(--brand-lavender)); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 24px; }
    .pinfo { flex: 1; } .pname-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .pname-row h2 { margin: 0; font-size: 20px; }
    .contact { display: flex; align-items: center; gap: 6px; color: var(--brand-text-secondary); font-size: 13px; margin: 6px 0 0; }
    .contact mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .lock { color: #b3261e; } .unlock { background: var(--brand-pink); color: #fff; }

    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; }
    @media (max-width: 800px) { .stats { grid-template-columns: 1fr 1fr; } }
    .stat { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; padding: 16px; display: flex; align-items: center; gap: 12px; }
    .stat .ic { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
    .ic.pink { background: var(--brand-pink-light); color: var(--brand-pink); } .ic.green { background: #dcefe4; color: #2f7d52; }
    .ic.gold { background: var(--brand-gold-light); color: #5a4512; } .ic.lav { background: var(--brand-lavender-light); color: #7a4f63; }
    .stat .v { display: block; font-size: 18px; font-weight: 700; color: var(--brand-text-primary); } .stat .l { font-size: 12px; color: var(--brand-text-secondary); }

    .grid { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
    .order-row { display: flex; align-items: center; gap: 12px; padding: 10px 8px; border-radius: 10px; text-decoration: none; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .order-row:last-child { border-bottom: none; } .order-row:hover { background: var(--mat-sys-surface-variant); }
    .onum { color: var(--brand-pink); font-weight: 600; flex: 1; } .oamt { font-weight: 700; color: var(--brand-text-primary); } .odate { font-size: 12px; }
    .addr { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .addr:last-child { border-bottom: none; } .addr mat-icon { color: var(--brand-text-secondary); }
    .addr p { margin: 4px 0 0; color: var(--brand-text-secondary); font-size: 13px; }
    .def { font-size: 11px; font-weight: 600; background: var(--brand-pink-light); color: var(--brand-pink); padding: 2px 8px; border-radius: 8px; margin-left: 6px; }
    .fld { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 600; color: var(--brand-text-secondary); margin-bottom: 12px; }
    .fld input, .fld textarea { border: 1px solid var(--mat-sys-outline-variant); border-radius: 9px; padding: 9px 11px; font-size: 14px; font-family: inherit; }
    .submit { width: 100%; background: var(--brand-pink); color: #fff; } .muted { color: var(--brand-text-secondary); }

    .badge { font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 10px; white-space: nowrap; }
    .badge.on { background: #dcefe4; color: #2f7d52; } .badge.off { background: #ffdad6; color: #b3261e; }
    .role { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 8px; background: var(--mat-sys-surface-variant); color: var(--brand-text-secondary); }
    .role.admin { background: var(--brand-gold-light); color: #5a4512; }
    .st-pending { background: #f8ebcf; color: #8a6d1a; } .st-paid { background: #dbe7ff; color: #2f5bbd; }
    .st-preparing { background: var(--brand-lavender-light); color: #7a4f63; } .st-shipping { background: var(--brand-pink-light); color: #a23a4d; }
    .st-delivered { background: #dcefe4; color: #2f7d52; } .st-returned { background: #fde3cf; color: #b5591a; } .st-cancelled { background: #eeeeee; color: #777; }
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

  totalSpent = computed(() => {
    const u = this.user();
    if (!u) return 0;
    return u.orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.final_amount, 0);
  });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getById(this.id).subscribe({
      next: (u) => { this.user.set(u); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  setStatus(status: 'active' | 'locked'): void {
    this.saving.set(true);
    this.service.updateStatus(this.id, status).subscribe({
      next: (res) => { this.saving.set(false); this.snack.open(res.message, 'OK', { duration: 2500 }); this.load(); },
      error: (err) => { this.saving.set(false); this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 }); }
    });
  }

  sendNotif(): void {
    if (!this.notifTitle) return;
    this.saving.set(true);
    this.service.sendNotification(this.id, { title: this.notifTitle, message: this.notifMessage }).subscribe({
      next: (res) => { this.saving.set(false); this.notifTitle = ''; this.notifMessage = ''; this.snack.open(res.message, 'OK', { duration: 2500 }); },
      error: (err) => { this.saving.set(false); this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 }); }
    });
  }

  initials(): string {
    const n = this.user()?.full_name || '?';
    return n.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();
  }
  statusLabel(s: string): string { return ORDER_STATUS_LABELS[s] ?? s; }
  cls(s: string): string { return ORDER_STATUS_CLASS[s] ?? ''; }
}
