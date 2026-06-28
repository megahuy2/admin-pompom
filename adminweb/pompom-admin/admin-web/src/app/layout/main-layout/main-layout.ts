import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <mat-sidenav-container class="layout">
      <mat-sidenav mode="side" opened class="sidenav">
        <div class="brand">
          <img src="logo.png" alt="PomPom" class="brand-logo" />
          <span>PomPom Admin</span>
        </div>
        <mat-nav-list>
          @for (item of navItems; track item.path) {
            <a mat-list-item [routerLink]="item.path" routerLinkActive="active-link">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary" class="topbar">
          <span class="spacer"></span>
          <span class="user-name">{{ auth.currentUser()?.full_name }}</span>
          <button mat-icon-button (click)="logout()" aria-label="Đăng xuất" title="Đăng xuất">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .layout { height: 100vh; background: var(--brand-background); }
    .sidenav {
      width: 248px;
      background: var(--mat-sys-surface);
      border-right: 1px solid var(--mat-sys-outline-variant);
    }
    .brand {
      display: flex; align-items: center; gap: 10px;
      padding: 20px 16px; font-weight: 700; font-size: 19px;
      color: var(--brand-pink);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .brand-logo { height: 32px; width: auto; object-fit: contain; }
    mat-nav-list { padding: 8px; }
    mat-nav-list a {
      border-radius: 10px;
      margin-bottom: 4px;
      color: var(--brand-text-secondary);
    }
    .topbar {
      position: sticky; top: 0; z-index: 2;
      background: linear-gradient(90deg, var(--brand-pink) 0%, var(--brand-lavender) 100%);
      color: var(--mat-sys-on-primary);
      box-shadow: 0 2px 8px rgba(232, 152, 154, 0.25);
    }
    .topbar mat-icon { color: var(--mat-sys-on-primary); }
    .spacer { flex: 1 1 auto; }
    .user-name { margin-right: 12px; font-size: 14px; font-weight: 500; }
    .content { padding: 24px; }
    .active-link {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container) !important;
      font-weight: 600;
    }
    .active-link mat-icon { color: var(--mat-sys-on-primary-container); }
  `]
})
export class MainLayout {
  auth = inject(AuthService);
  private router = inject(Router);

  navItems: NavItem[] = [
    { label: 'Tổng quan', path: '/dashboard', icon: 'dashboard' },
    { label: 'Thống kê & báo cáo', path: '/reports', icon: 'bar_chart' },
    { label: 'Sản phẩm', path: '/products', icon: 'inventory_2' },
    { label: 'Đơn hàng', path: '/orders', icon: 'receipt_long' },
    { label: 'Người dùng', path: '/users', icon: 'group' },
    { label: 'Cộng đồng', path: '/community', icon: 'forum' },
    { label: 'Duyệt nội dung', path: '/moderation', icon: 'fact_check' },
    { label: 'Quản lý Banner', path: '/content/banners', icon: 'view_carousel' },
    { label: 'Quản lý Collection', path: '/content/collections', icon: 'collections' },
    { label: 'Quick Links', path: '/content/quick-links', icon: 'link' },
    { label: 'Section Home', path: '/content/sections', icon: 'dashboard_customize' },
    { label: 'Cài đặt & hệ thống', path: '/settings', icon: 'settings' }
  ];

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
