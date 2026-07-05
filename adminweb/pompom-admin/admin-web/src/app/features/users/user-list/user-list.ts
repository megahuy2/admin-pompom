import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { User } from '../../../core/models/models';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-user-list',
  imports: [
    RouterLink, FormsModule, DatePipe, DecimalPipe,
    MatButtonModule, MatIconModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Khách hàng</h1>
        <p class="sub">{{ total() | number }} khách hàng</p>
      </div>
    </div>

    <div class="chips">
      <button class="chip" [class.on]="status === ''" (click)="setStatus('')">Tất cả</button>
      <button class="chip" [class.on]="status === 'active'" (click)="setStatus('active')">Hoạt động</button>
      <button class="chip" [class.on]="status === 'locked'" (click)="setStatus('locked')">Đã khóa</button>
      <span class="divider"></span>
      <button class="chip" [class.on]="role === ''" (click)="setRole('')">Mọi vai trò</button>
      <button class="chip" [class.on]="role === 'user'" (click)="setRole('user')">User</button>
      <button class="chip" [class.on]="role === 'admin'" (click)="setRole('admin')">Admin</button>
    </div>

    <div class="toolbar">
      <div class="search">
        <mat-icon>search</mat-icon>
        <input [(ngModel)]="search" (keyup.enter)="applyFilter()" placeholder="Tìm theo tên hoặc email…" />
        @if (search) { <mat-icon class="clear" (click)="search=''; applyFilter()">close</mat-icon> }
      </div>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Khách hàng</th>
            <th>Số điện thoại</th>
            <th>Vai trò</th>
            <th class="num">Số đơn</th>
            <th class="num">Tổng chi tiêu</th>
            <th>Trạng thái</th>
            <th>Ngày tham gia</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (u of users(); track u._id) {
            <tr>
              <td class="cust-cell">
                @if (u.avatar_url) { <img class="avatar" [src]="u.avatar_url" alt="" /> }
                @else { <div class="avatar ph">{{ initials(u) }}</div> }
                <div class="cinfo">
                  <a class="cname" [routerLink]="['/users', u._id]">{{ u.full_name }}</a>
                  <span class="cemail">{{ u.email }}</span>
                </div>
              </td>
              <td class="muted">{{ u.phone_number || '—' }}</td>
              <td><span class="role" [class.admin]="u.role === 'admin'">{{ u.role === 'admin' ? 'Admin' : 'User' }}</span></td>
              <td class="num">{{ u.order_count || 0 }}</td>
              <td class="num strong">{{ (u.total_spent || 0) | number }} ₫</td>
              <td><span class="badge" [class.on]="u.status === 'active'" [class.off]="u.status !== 'active'">
                {{ u.status === 'active' ? 'Hoạt động' : 'Đã khóa' }}</span></td>
              <td class="muted">{{ u.join_date | date:'dd/MM/yyyy' }}</td>
              <td><button mat-icon-button [routerLink]="['/users', u._id]" matTooltip="Chi tiết"><mat-icon>chevron_right</mat-icon></button></td>
            </tr>
          }
        </tbody>
      </table>
      @if (!loading() && users().length === 0) {
        <div class="empty"><mat-icon>group</mat-icon><p>Không có khách hàng nào.</p></div>
      }
    </div>

    <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page() - 1"
      [pageSizeOptions]="[10, 20, 50, 100]" (page)="onPage($event)"></mat-paginator>
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { margin: 0; } .sub { margin: 2px 0 14px; color: var(--brand-text-secondary); font-size: 13px; }
    .chips { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
    .chip { border: 1px solid var(--mat-sys-outline-variant); background: var(--mat-sys-surface); color: var(--brand-text-secondary);
      padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; }
    .chip:hover { border-color: var(--brand-pink); color: var(--brand-pink); }
    .chip.on { background: linear-gradient(135deg, var(--brand-pink), var(--brand-lavender)); color: #fff; border-color: transparent; }
    .divider { width: 1px; height: 22px; background: var(--mat-sys-outline-variant); margin: 0 4px; }
    .toolbar { margin-bottom: 14px; }
    .search { display: flex; align-items: center; gap: 8px; background: var(--mat-sys-surface);
      border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 8px 12px; max-width: 380px; }
    .search:focus-within { border-color: var(--brand-pink); box-shadow: 0 0 0 3px var(--brand-pink-light); }
    .search input { border: none; outline: none; background: transparent; width: 100%; font-size: 14px; }
    .search mat-icon { color: var(--brand-text-secondary); font-size: 20px; } .search .clear { cursor: pointer; }

    .table-wrap { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; overflow: auto; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
    .tbl thead th { text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
      color: var(--brand-text-secondary); padding: 12px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); white-space: nowrap; }
    .tbl tbody td { padding: 10px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); vertical-align: middle; }
    .tbl tbody tr:last-child td { border-bottom: none; } .tbl tbody tr:hover { background: var(--mat-sys-surface-variant); }
    .num { text-align: right; } .strong { font-weight: 700; } .muted { color: var(--brand-text-secondary); white-space: nowrap; }
    .cust-cell { display: flex; align-items: center; gap: 12px; min-width: 220px; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex: 0 0 auto; }
    .avatar.ph { background: linear-gradient(135deg, var(--brand-pink), var(--brand-lavender)); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
    .cinfo { display: flex; flex-direction: column; }
    .cname { color: var(--brand-text-primary); font-weight: 600; text-decoration: none; } .cname:hover { color: var(--brand-pink); }
    .cemail { font-size: 12px; color: var(--brand-text-secondary); }
    .role { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 8px; background: var(--mat-sys-surface-variant); color: var(--brand-text-secondary); }
    .role.admin { background: var(--brand-gold-light); color: #5a4512; }
    .badge { font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 10px; }
    .badge.on { background: #dcefe4; color: #2f7d52; } .badge.off { background: #ffdad6; color: #b3261e; }
    .empty { text-align: center; padding: 48px 20px; color: var(--brand-text-secondary); }
    .empty mat-icon { font-size: 42px; width: 42px; height: 42px; opacity: .4; } .empty p { margin: 8px 0 0; }
  `]
})
export class UserList implements OnInit {
  private service = inject(UserService);

  users = signal<User[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  limit = 20;

  search = '';
  role = '';
  status = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.list({ page: this.page(), limit: this.limit, search: this.search, role: this.role, status: this.status })
      .subscribe({
        next: (res) => { this.users.set(res.data); this.total.set(res.total); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
  }

  applyFilter(): void { this.page.set(1); this.load(); }
  setStatus(s: string): void { this.status = s; this.applyFilter(); }
  setRole(r: string): void { this.role = r; this.applyFilter(); }
  onPage(e: PageEvent): void { this.limit = e.pageSize; this.page.set(e.pageIndex + 1); this.load(); }

  initials(u: User): string {
    return (u.full_name || '?').trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();
  }
}
