import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { inject } from '@angular/core';

// MOCK - chưa kết nối backend thật, chỉ demo UI cho đồ án.
// Tất cả giá trị dưới đây là mock mặc định, nút lưu/sao lưu chỉ hiện thông báo giả,
// KHÔNG gọi API và KHÔNG persist (refresh trang sẽ về giá trị mặc định).
interface ShippingFee { area: string; fee: number; }

@Component({
  selector: 'app-settings',
  imports: [
    FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule
  ],
  template: `
    <h1>Cài đặt &amp; hệ thống</h1>
    <p class="mock-note"><mat-icon>info</mat-icon> Dữ liệu mẫu (mock) — các thao tác chỉ demo, không lưu thật.</p>

    <div class="cols">
      <!-- Thông tin shop -->
      <mat-card>
        <mat-card-header><mat-card-title>Thông tin shop</mat-card-title></mat-card-header>
        <mat-card-content class="form">
          <mat-form-field appearance="outline"><mat-label>Tên shop</mat-label>
            <input matInput [(ngModel)]="shop.name" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Địa chỉ</mat-label>
            <input matInput [(ngModel)]="shop.address" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Hotline</mat-label>
            <input matInput [(ngModel)]="shop.hotline" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Email</mat-label>
            <input matInput [(ngModel)]="shop.email" /></mat-form-field>
          <button mat-flat-button color="primary" (click)="save('Thông tin shop')">Lưu thông tin</button>
        </mat-card-content>
      </mat-card>

      <!-- Tỷ giá -->
      <mat-card>
        <mat-card-header><mat-card-title>Cài đặt tỷ giá</mat-card-title></mat-card-header>
        <mat-card-content class="form">
          <mat-form-field appearance="outline"><mat-label>Tỷ giá điểm thưởng (1 điểm = ? ₫)</mat-label>
            <input matInput type="number" [(ngModel)]="exchangeRate" /></mat-form-field>
          <button mat-flat-button color="primary" (click)="save('Tỷ giá')">Lưu tỷ giá</button>
        </mat-card-content>
      </mat-card>

      <!-- Phí vận chuyển -->
      <mat-card>
        <mat-card-header><mat-card-title>Cài đặt phí vận chuyển</mat-card-title></mat-card-header>
        <mat-card-content class="form">
          @for (s of shippingFees; track s.area) {
            <mat-form-field appearance="outline">
              <mat-label>{{ s.area }}</mat-label>
              <input matInput type="number" [(ngModel)]="s.fee" />
              <span matTextSuffix>₫</span>
            </mat-form-field>
          }
          <button mat-flat-button color="primary" (click)="save('Phí vận chuyển')">Lưu phí vận chuyển</button>
        </mat-card-content>
      </mat-card>

      <!-- Sao lưu -->
      <mat-card>
        <mat-card-header><mat-card-title>Sao lưu dữ liệu</mat-card-title></mat-card-header>
        <mat-card-content class="form">
          <p class="hint">Tạo bản sao lưu toàn bộ dữ liệu hệ thống (demo).</p>
          <button mat-flat-button color="accent" (click)="backup()">
            <mat-icon>backup</mat-icon> Sao lưu dữ liệu
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .mock-note { display: flex; align-items: center; gap: 6px; color: var(--brand-gold); font-size: 13px; }
    .mock-note mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .form { display: flex; flex-direction: column; }
    .form mat-form-field { width: 100%; }
    .hint { color: var(--brand-text-secondary); margin-top: 0; }
    button { align-self: flex-start; }
  `]
})
export class Settings {
  private snack = inject(MatSnackBar);

  // MOCK - giá trị mặc định
  shop = {
    name: 'PomPom Cosmetics',
    address: '123 Đường Hoa Hồng, Quận 1, TP.HCM',
    hotline: '1900 6789',
    email: 'support@pompom.vn'
  };
  exchangeRate = 1000;
  shippingFees: ShippingFee[] = [
    { area: 'Nội thành', fee: 15000 },
    { area: 'Ngoại thành', fee: 25000 },
    { area: 'Tỉnh khác', fee: 35000 }
  ];

  save(section: string): void {
    // MOCK - chỉ hiển thị thông báo, không gọi API
    this.snack.open(`Đã lưu "${section}" (mock - chưa lưu thật)`, 'OK', { duration: 2500 });
  }

  backup(): void {
    // MOCK - chỉ hiển thị thông báo giả
    this.snack.open('Đã sao lưu thành công (mock)', 'OK', { duration: 2500 });
  }
}
