import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Product, User } from '../../../core/models/models';
import { ProductService } from '../../../core/services/product.service';
import { UserService } from '../../../core/services/user.service';
import { OrderService } from '../../../core/services/order.service';
import { UploadService } from '../../../core/services/upload.service';

interface Line { product: Product; quantity: number; }

@Component({
  selector: 'app-order-create',
  imports: [RouterLink, FormsModule, DecimalPipe, MatIconModule, MatButtonModule],
  template: `
    <div class="head">
      <button mat-icon-button routerLink="/orders"><mat-icon>arrow_back</mat-icon></button>
      <h1>Tạo đơn hàng</h1>
    </div>

    <div class="grid">
      <div class="col-main">
        <!-- Customer -->
        <section class="card">
          <h3>Khách hàng</h3>
          @if (customer(); as c) {
            <div class="picked">
              <div class="avatar">{{ c.full_name.charAt(0) }}</div>
              <div class="pinfo"><b>{{ c.full_name }}</b><span>{{ c.email }}</span></div>
              <button mat-icon-button (click)="customer.set(null)"><mat-icon>close</mat-icon></button>
            </div>
          } @else {
            <div class="search">
              <mat-icon>search</mat-icon>
              <input [(ngModel)]="custQuery" (ngModelChange)="searchCustomers()" placeholder="Tìm khách hàng theo tên/email… (để trống = khách vãng lai)" />
            </div>
            @if (custResults().length) {
              <div class="results">
                @for (u of custResults(); track u._id) {
                  <button class="result" (click)="pickCustomer(u)">
                    <b>{{ u.full_name }}</b><span>{{ u.email }}</span>
                  </button>
                }
              </div>
            }
          }
        </section>

        <!-- Products -->
        <section class="card">
          <h3>Sản phẩm</h3>
          <div class="search">
            <mat-icon>search</mat-icon>
            <input [(ngModel)]="prodQuery" (ngModelChange)="searchProducts()" placeholder="Tìm sản phẩm để thêm…" />
          </div>
          @if (prodResults().length) {
            <div class="results">
              @for (p of prodResults(); track p._id) {
                <button class="result prod" (click)="addProduct(p)">
                  <span class="pn">{{ p.name }}</span>
                  <span class="pp">{{ (p.sale_price || p.price) | number }} ₫</span>
                </button>
              }
            </div>
          }

          @if (lines().length === 0) {
            <p class="muted">Chưa có sản phẩm. Tìm và thêm ở trên.</p>
          } @else {
            <table class="lines">
              <thead><tr><th>Sản phẩm</th><th>Đơn giá</th><th>SL</th><th class="r">Thành tiền</th><th></th></tr></thead>
              <tbody>
                @for (l of lines(); track l.product._id) {
                  <tr>
                    <td>{{ l.product.name }}</td>
                    <td>{{ unit(l.product) | number }} ₫</td>
                    <td>
                      <div class="stepper">
                        <button (click)="setQty(l, l.quantity - 1)">−</button>
                        <span>{{ l.quantity }}</span>
                        <button (click)="setQty(l, l.quantity + 1)">+</button>
                      </div>
                    </td>
                    <td class="r strong">{{ unit(l.product) * l.quantity | number }} ₫</td>
                    <td><button mat-icon-button (click)="remove(l)"><mat-icon>delete</mat-icon></button></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      </div>

      <!-- Summary -->
      <aside class="col-side">
        <section class="card">
          <h3>Thanh toán</h3>
          <label class="fld">Phương thức
            <select [(ngModel)]="paymentMethod">
              <option value="COD">COD</option><option value="VNPay">VNPay</option>
              <option value="MoMo">MoMo</option><option value="VISA">VISA</option>
            </select>
          </label>
          <label class="fld">Phí vận chuyển
            <input type="number" min="0" [(ngModel)]="shippingFee" />
          </label>
          <label class="fld">Giảm giá
            <input type="number" min="0" [(ngModel)]="discount" />
          </label>
          <label class="fld">Ghi chú
            <input [(ngModel)]="note" placeholder="Ghi chú đơn (tuỳ chọn)" />
          </label>

          <div class="sumrow"><span>Tạm tính</span><b>{{ subtotal() | number }} ₫</b></div>
          <div class="sumrow"><span>Phí ship</span><b>{{ (+shippingFee || 0) | number }} ₫</b></div>
          <div class="sumrow"><span>Giảm giá</span><b>− {{ (+discount || 0) | number }} ₫</b></div>
          <div class="sumrow total"><span>Thành tiền</span><b>{{ finalAmount() | number }} ₫</b></div>

          <button mat-flat-button class="submit" (click)="submit()" [disabled]="lines().length === 0 || saving()">
            <mat-icon>check</mat-icon> Tạo đơn hàng
          </button>
        </section>
      </aside>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .head { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .head h1 { margin: 0; }
    .grid { display: grid; grid-template-columns: 1fr 360px; gap: 16px; align-items: start; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .card { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; padding: 18px; margin-bottom: 16px; }
    .card h3 { margin: 0 0 14px; font-size: 16px; }
    .search { display: flex; align-items: center; gap: 8px; background: var(--brand-background); border: 1px solid var(--mat-sys-outline-variant); border-radius: 10px; padding: 9px 12px; }
    .search:focus-within { border-color: var(--brand-pink); }
    .search input { border: none; outline: none; background: transparent; width: 100%; font-size: 14px; }
    .search mat-icon { color: var(--brand-text-secondary); }
    .results { margin-top: 8px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 10px; overflow: hidden; }
    .result { display: flex; flex-direction: column; align-items: flex-start; width: 100%; text-align: left; border: none; background: transparent; padding: 9px 12px; cursor: pointer; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .result:last-child { border-bottom: none; }
    .result:hover { background: var(--brand-pink-light); }
    .result b { font-size: 14px; } .result span { font-size: 12px; color: var(--brand-text-secondary); }
    .result.prod { flex-direction: row; justify-content: space-between; align-items: center; }
    .result.prod .pn { font-weight: 500; } .result.prod .pp { color: var(--brand-pink); font-weight: 600; }
    .picked { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--brand-pink), var(--brand-lavender)); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .pinfo { flex: 1; display: flex; flex-direction: column; } .pinfo b { font-size: 14px; } .pinfo span { font-size: 12px; color: var(--brand-text-secondary); }
    .muted { color: var(--brand-text-secondary); margin: 14px 0 0; }
    .lines { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 14px; }
    .lines th { text-align: left; font-size: 12px; color: var(--brand-text-secondary); padding: 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .lines td { padding: 10px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .lines .r { text-align: right; } .strong { font-weight: 700; }
    .stepper { display: inline-flex; align-items: center; border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; overflow: hidden; }
    .stepper button { border: none; background: var(--brand-background); width: 28px; height: 28px; font-size: 16px; cursor: pointer; }
    .stepper span { width: 34px; text-align: center; font-weight: 600; }
    .fld { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 600; color: var(--brand-text-secondary); margin-bottom: 12px; }
    .fld select, .fld input { border: 1px solid var(--mat-sys-outline-variant); border-radius: 9px; padding: 9px 11px; font-size: 14px; font-family: inherit; color: var(--brand-text-primary); }
    .sumrow { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: var(--brand-text-secondary); }
    .sumrow.total { border-top: 1px solid var(--mat-sys-outline-variant); margin-top: 6px; padding-top: 12px; font-size: 17px; color: var(--brand-text-primary); }
    .submit { width: 100%; margin-top: 14px; background: var(--brand-pink); color: #fff; }
  `]
})
export class OrderCreate {
  private products = inject(ProductService);
  private users = inject(UserService);
  private orders = inject(OrderService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  upload = inject(UploadService);

  customer = signal<User | null>(null);
  custQuery = '';
  custResults = signal<User[]>([]);

  prodQuery = '';
  prodResults = signal<Product[]>([]);
  lines = signal<Line[]>([]);

  paymentMethod = 'COD';
  shippingFee = 0;
  discount = 0;
  note = '';
  saving = signal(false);

  subtotal = computed(() => this.lines().reduce((s, l) => s + this.unit(l.product) * l.quantity, 0));
  finalAmount = computed(() => Math.max(0, this.subtotal() + (+this.shippingFee || 0) - (+this.discount || 0)));

  unit(p: Product): number { return p.sale_price || p.price; }

  private custTimer?: ReturnType<typeof setTimeout>;
  searchCustomers(): void {
    clearTimeout(this.custTimer);
    const q = this.custQuery.trim();
    if (!q) { this.custResults.set([]); return; }
    this.custTimer = setTimeout(() => {
      this.users.list({ search: q, role: 'user', limit: 6 }).subscribe((res) => this.custResults.set(res.data));
    }, 250);
  }
  pickCustomer(u: User): void { this.customer.set(u); this.custResults.set([]); this.custQuery = ''; }

  private prodTimer?: ReturnType<typeof setTimeout>;
  searchProducts(): void {
    clearTimeout(this.prodTimer);
    const q = this.prodQuery.trim();
    if (!q) { this.prodResults.set([]); return; }
    this.prodTimer = setTimeout(() => {
      this.products.list({ search: q, limit: 8 }).subscribe((res) => this.prodResults.set(res.data));
    }, 250);
  }
  addProduct(p: Product): void {
    const existing = this.lines().find((l) => l.product._id === p._id);
    if (existing) { this.setQty(existing, existing.quantity + 1); }
    else { this.lines.set([...this.lines(), { product: p, quantity: 1 }]); }
    this.prodResults.set([]); this.prodQuery = '';
  }
  setQty(l: Line, qty: number): void {
    if (qty < 1) return;
    this.lines.set(this.lines().map((x) => (x.product._id === l.product._id ? { ...x, quantity: qty } : x)));
  }
  remove(l: Line): void { this.lines.set(this.lines().filter((x) => x.product._id !== l.product._id)); }

  submit(): void {
    if (this.lines().length === 0) return;
    this.saving.set(true);
    this.orders.create({
      user_id: this.customer()?._id || null,
      items: this.lines().map((l) => ({ product_id: l.product._id, quantity: l.quantity })),
      payment_method: this.paymentMethod,
      shipping_fee: +this.shippingFee || 0,
      discount_amount: +this.discount || 0,
      note: this.note
    }).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.snack.open(res.message, 'OK', { duration: 2500 });
        this.router.navigate(['/orders', res.order._id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.message ?? 'Không tạo được đơn', 'Đóng', { duration: 3000 });
      }
    });
  }
}
