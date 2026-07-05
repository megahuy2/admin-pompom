import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';

interface NavItem { label: string; path: string; icon: string; }
interface NavGroup { title: string; items: NavItem[]; }

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule
  ],
  template: `
    <div class="shell" [class.collapsed]="collapsed()">
      <!-- ============ SIDEBAR ============ -->
      <aside class="sidebar">
        <div class="brand">
          <img src="logo.png" alt="PomPom" class="brand-logo" />
          @if (!collapsed()) { <span class="brand-name">PomPom<small>Admin</small></span> }
        </div>

        <nav class="nav">
          @for (group of navGroups; track group.title) {
            <div class="nav-group">
              @if (!collapsed()) { <span class="nav-group-title">{{ group.title }}</span> }
              @for (item of group.items; track item.path) {
                <a class="nav-item" [routerLink]="item.path"
                   routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
                   [matTooltip]="collapsed() ? item.label : ''" matTooltipPosition="right">
                  <mat-icon>{{ item.icon }}</mat-icon>
                  @if (!collapsed()) { <span class="nav-label">{{ item.label }}</span> }
                </a>
              }
            </div>
          }
        </nav>
      </aside>

      <!-- ============ MAIN ============ -->
      <div class="main">
        <header class="topbar">
          <button mat-icon-button class="toggle" (click)="collapsed.set(!collapsed())"
                  matTooltip="Thu gọn menu">
            <mat-icon>menu</mat-icon>
          </button>

          <span class="spacer"></span>

          <button mat-icon-button matTooltip="Về trang bán hàng" (click)="openStore()">
            <mat-icon>storefront</mat-icon>
          </button>
          <button mat-icon-button class="bell" matTooltip="Thông báo" routerLink="/moderation">
            <mat-icon>notifications</mat-icon>
          </button>

          <button class="user-btn" [matMenuTriggerFor]="userMenu">
            <div class="avatar">{{ initials() }}</div>
            <div class="user-meta">
              <span class="user-name">{{ auth.currentUser()?.full_name || 'Admin' }}</span>
              <span class="user-role">Quản trị viên</span>
            </div>
            <mat-icon class="chev">expand_more</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item routerLink="/settings">
              <mat-icon>settings</mat-icon><span>Cấu hình</span>
            </button>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon><span>Đăng xuất</span>
            </button>
          </mat-menu>
        </header>

        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .shell { display: flex; height: 100vh; background: var(--brand-background); overflow: hidden; }

    /* ---------- SIDEBAR ---------- */
    .sidebar {
      width: 244px; flex: 0 0 244px; background: var(--mat-sys-surface);
      border-right: 1px solid var(--mat-sys-outline-variant);
      display: flex; flex-direction: column; transition: width .2s ease, flex-basis .2s ease;
    }
    .collapsed .sidebar { width: 72px; flex-basis: 72px; }
    .brand {
      display: flex; align-items: center; gap: 10px; padding: 16px 18px; height: 60px;
      border-bottom: 1px solid var(--mat-sys-outline-variant); overflow: hidden;
    }
    .brand-logo { height: 30px; width: 30px; object-fit: contain; flex: 0 0 auto; }
    .brand-name { font-weight: 800; font-size: 19px; color: var(--brand-pink); white-space: nowrap; letter-spacing: -.3px; }
    .brand-name small { font-weight: 600; font-size: 12px; color: var(--brand-text-secondary); margin-left: 5px; }

    .nav { flex: 1; overflow-y: auto; padding: 8px 10px 20px; scrollbar-width: thin; }
    .nav::-webkit-scrollbar { width: 6px; }
    .nav::-webkit-scrollbar-thumb { background: var(--mat-sys-outline-variant); border-radius: 3px; }
    .nav-group { margin-bottom: 6px; }
    .nav-group-title {
      display: block; font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase;
      color: var(--brand-text-secondary); opacity: .7; padding: 12px 12px 6px;
    }
    .nav-item {
      display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 10px;
      color: var(--brand-text-secondary); text-decoration: none; font-size: 14px; font-weight: 500;
      margin-bottom: 2px; transition: background .15s, color .15s; white-space: nowrap;
    }
    .nav-item mat-icon { font-size: 21px; width: 21px; height: 21px; flex: 0 0 auto; }
    .nav-item:hover { background: var(--brand-pink-light); color: var(--brand-pink); }
    .nav-item.active {
      background: linear-gradient(135deg, var(--brand-pink), var(--brand-lavender));
      color: #fff; font-weight: 600; box-shadow: 0 4px 12px rgba(232, 152, 154, 0.35);
    }
    .collapsed .nav-item { justify-content: center; padding: 10px; }
    .collapsed .nav-group { border-top: 1px solid var(--mat-sys-outline-variant); padding-top: 4px; margin-bottom: 4px; }
    .collapsed .nav-group:first-child { border-top: none; }

    /* ---------- TOPBAR ---------- */
    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .topbar {
      height: 60px; flex: 0 0 60px; display: flex; align-items: center; gap: 6px; padding: 0 16px;
      background: var(--mat-sys-surface); border-bottom: 1px solid var(--mat-sys-outline-variant);
      position: sticky; top: 0; z-index: 10;
    }
    .toggle { color: var(--brand-text-secondary); }
    .spacer { flex: 1; }
    .topbar .bell mat-icon, .topbar .toggle mat-icon { color: var(--brand-text-secondary); }
    .user-btn {
      display: flex; align-items: center; gap: 10px; border: none; background: transparent; cursor: pointer;
      padding: 5px 8px 5px 5px; border-radius: 999px; transition: background .15s;
    }
    .user-btn:hover { background: var(--mat-sys-surface-variant); }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%; flex: 0 0 auto;
      background: linear-gradient(135deg, var(--brand-pink), var(--brand-lavender));
      color: #fff; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center;
    }
    .user-meta { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.15; }
    .user-name { font-size: 13.5px; font-weight: 600; color: var(--brand-text-primary); }
    .user-role { font-size: 11px; color: var(--brand-text-secondary); }
    .chev { color: var(--brand-text-secondary); font-size: 20px; }

    .content { flex: 1; overflow-y: auto; padding: 24px; }

    @media (max-width: 720px) {
      .user-meta { display: none; }
      .content { padding: 16px; }
    }
  `]
})
export class MainLayout {
  auth = inject(AuthService);
  private router = inject(Router);
  collapsed = signal(false);

  navGroups: NavGroup[] = [
    {
      title: 'Tổng quan',
      items: [{ label: 'Tổng quan', path: '/dashboard', icon: 'space_dashboard' }]
    },
    {
      title: 'Bán hàng',
      items: [
        { label: 'Đơn hàng', path: '/orders', icon: 'receipt_long' },
        { label: 'Vận chuyển', path: '/shipping', icon: 'local_shipping' },
        { label: 'Khách hàng', path: '/users', icon: 'group' }
      ]
    },
    {
      title: 'Sản phẩm',
      items: [
        { label: 'Sản phẩm', path: '/products', icon: 'inventory_2' },
        { label: 'Danh mục', path: '/categories', icon: 'category' },
        { label: 'Bộ sưu tập', path: '/content/collections', icon: 'collections_bookmark' },
        { label: 'Voucher', path: '/vouchers', icon: 'confirmation_number' }
      ]
    },
    {
      title: 'Cộng đồng',
      items: [
        { label: 'Cộng đồng', path: '/community', icon: 'forum' },
        { label: 'Bài viết', path: '/posts', icon: 'article' },
        { label: 'Duyệt nội dung', path: '/moderation', icon: 'fact_check' }
      ]
    },
    {
      title: 'Website',
      items: [
        { label: 'Banner', path: '/content/banners', icon: 'view_carousel' },
        { label: 'Website', path: '/content/sections', icon: 'dashboard_customize' },
        { label: 'Quick Links', path: '/content/quick-links', icon: 'link' }
      ]
    },
    {
      title: 'Phân tích',
      items: [
        { label: 'Thống kê', path: '/reports', icon: 'insights' },
        { label: 'Báo cáo', path: '/report-export', icon: 'assessment' }
      ]
    },
    {
      title: 'Hệ thống',
      items: [{ label: 'Cấu hình', path: '/settings', icon: 'settings' }]
    }
  ];

  initials(): string {
    const name = this.auth.currentUser()?.full_name || 'Admin';
    return name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();
  }

  openStore(): void {
    window.open('http://localhost:5000/community/', '_blank');
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
