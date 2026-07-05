import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/**
 * Màn hình tạm cho các mục menu sẽ được xây dựng ở module tiếp theo.
 * Lấy tiêu đề/mô tả từ route data — KHÔNG hiển thị số liệu giả.
 */
@Component({
  selector: 'app-placeholder',
  imports: [MatIconModule],
  template: `
    <div class="ph">
      <div class="ph-card">
        <div class="ph-icon"><mat-icon>{{ icon() }}</mat-icon></div>
        <h1>{{ title() }}</h1>
        <p>Màn hình <b>{{ title() }}</b> sẽ được hoàn thiện ở module tiếp theo của quá trình nâng cấp.</p>
        <span class="ph-tag"><mat-icon>construction</mat-icon> Đang phát triển</span>
      </div>
    </div>
  `,
  styles: [`
    .ph { display: flex; justify-content: center; align-items: center; min-height: 60vh; }
    .ph-card {
      text-align: center; max-width: 420px; padding: 40px 32px; border-radius: 20px;
      background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant);
    }
    .ph-icon {
      width: 72px; height: 72px; margin: 0 auto 18px; border-radius: 20px;
      display: flex; align-items: center; justify-content: center;
      background: var(--brand-pink-light); color: var(--brand-pink);
    }
    .ph-icon mat-icon { font-size: 38px; width: 38px; height: 38px; }
    .ph-card h1 { margin: 0 0 8px; font-size: 22px; }
    .ph-card p { color: var(--brand-text-secondary); margin: 0 0 18px; line-height: 1.5; }
    .ph-tag {
      display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
      color: var(--brand-gold); background: var(--brand-gold-light); padding: 7px 14px; border-radius: 999px;
    }
    .ph-tag mat-icon { font-size: 17px; width: 17px; height: 17px; }
  `]
})
export class Placeholder {
  private route = inject(ActivatedRoute);
  title = toSignal(this.route.data.pipe(map((d) => d['title'] || 'Tính năng')), { initialValue: 'Tính năng' });
  icon = toSignal(this.route.data.pipe(map((d) => d['icon'] || 'widgets')), { initialValue: 'widgets' });
}
