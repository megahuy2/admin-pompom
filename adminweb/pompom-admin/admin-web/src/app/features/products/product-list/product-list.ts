import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Category, Product } from '../../../core/models/models';
import { ProductService } from '../../../core/services/product.service';
import { UploadService } from '../../../core/services/upload.service';

interface SortOpt { value: string; label: string; sortBy: '_id' | 'price' | 'stock' | 'name'; sortDir: 'asc' | 'desc'; }

@Component({
  selector: 'app-product-list',
  imports: [
    RouterLink, FormsModule, DecimalPipe, DatePipe,
    MatButtonModule, MatIconModule, MatMenuModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Sản phẩm</h1>
        <p class="sub">{{ total() | number }} sản phẩm</p>
      </div>
      <div class="head-actions">
        <button mat-stroked-button routerLink="/categories"><mat-icon>category</mat-icon> Danh mục</button>
        <button mat-flat-button class="primary" routerLink="/products/new"><mat-icon>add</mat-icon> Thêm sản phẩm</button>
      </div>
    </div>

    <!-- Status quick filter -->
    <div class="chips">
      <button class="chip" [class.on]="activeFilter === ''" (click)="setActive('')">Tất cả</button>
      <button class="chip" [class.on]="activeFilter === 'true'" (click)="setActive('true')">Đang bán</button>
      <button class="chip" [class.on]="activeFilter === 'false'" (click)="setActive('false')">Đã ẩn</button>
    </div>

    <div class="toolbar">
      <div class="search">
        <mat-icon>search</mat-icon>
        <input [(ngModel)]="search" (keyup.enter)="applyFilter()" placeholder="Tìm theo tên hoặc SKU…" />
        @if (search) { <mat-icon class="clear" (click)="search=''; applyFilter()">close</mat-icon> }
      </div>
      <button mat-stroked-button [matMenuTriggerFor]="catMenu">
        <mat-icon>filter_list</mat-icon> {{ categoryName() }}
      </button>
      <mat-menu #catMenu="matMenu">
        <button mat-menu-item (click)="setCategory('')">Tất cả danh mục</button>
        @for (c of categories(); track c._id) {
          <button mat-menu-item (click)="setCategory(c._id)">{{ c.category_name }}</button>
        }
      </mat-menu>
      <button mat-stroked-button [matMenuTriggerFor]="sortMenu" class="sort-btn">
        <mat-icon>swap_vert</mat-icon> {{ currentSort().label }}
      </button>
      <mat-menu #sortMenu="matMenu">
        @for (o of sortOptions; track o.value) {
          <button mat-menu-item (click)="setSort(o)">{{ o.label }}</button>
        }
      </mat-menu>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>SKU</th>
            <th>Danh mục</th>
            <th class="num">Giá</th>
            <th class="num">Kho</th>
            <th class="num">Đã bán</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (p of products(); track p._id) {
            <tr>
              <td class="prod-cell">
                @if (p.images?.[0]?.image_url) {
                  <img class="thumb" [src]="upload.resolveUrl(p.images![0].image_url)" alt="{{ p.name }}" />
                } @else {
                  <div class="thumb placeholder"><mat-icon>image</mat-icon></div>
                }
                <a class="pname" [routerLink]="['/products', p._id, 'edit']">{{ p.name }}</a>
              </td>
              <td class="muted">{{ p.sku }}</td>
              <td>{{ categoryOf(p) }}</td>
              <td class="num">
                @if (p.sale_price) {
                  <span class="sale">{{ p.sale_price | number }} ₫</span>
                  <span class="orig">{{ p.price | number }} ₫</span>
                } @else {
                  <span class="strong">{{ p.price | number }} ₫</span>
                }
              </td>
              <td class="num">
                @if ((p.stock || 0) === 0) { <span class="stock out">Hết hàng</span> }
                @else if ((p.stock || 0) < 10) { <span class="stock low">{{ p.stock }}</span> }
                @else { {{ p.stock }} }
              </td>
              <td class="num">{{ p.sold || 0 }}</td>
              <td>
                <span class="badge" [class.on]="p.is_active" [class.off]="!p.is_active">
                  {{ p.is_active ? 'Đang bán' : 'Đã ẩn' }}
                </span>
              </td>
              <td class="muted">{{ p.created_at | date:'dd/MM/yyyy' }}</td>
              <td class="actions">
                <button mat-icon-button [routerLink]="['/products', p._id, 'edit']" matTooltip="Sửa"><mat-icon>edit</mat-icon></button>
                @if (p.is_active) {
                  <button mat-icon-button (click)="remove(p)" matTooltip="Ẩn"><mat-icon>visibility_off</mat-icon></button>
                } @else {
                  <button mat-icon-button (click)="restore(p)" matTooltip="Hiện lại"><mat-icon>visibility</mat-icon></button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
      @if (!loading() && products().length === 0) {
        <div class="empty"><mat-icon>inventory_2</mat-icon><p>Không có sản phẩm nào.</p></div>
      }
    </div>

    <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page() - 1"
      [pageSizeOptions]="[10, 20, 50, 100]" (page)="onPage($event)"></mat-paginator>
  `,
  styles: [`
    :host { display: block; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; }
    .page-head h1 { margin: 0; }
    .sub { margin: 2px 0 0; color: var(--brand-text-secondary); font-size: 13px; }
    .head-actions { display: flex; gap: 8px; }
    .head-actions .primary { background: var(--brand-pink); color: #fff; }

    .chips { display: flex; gap: 8px; margin-bottom: 14px; }
    .chip { border: 1px solid var(--mat-sys-outline-variant); background: var(--mat-sys-surface); color: var(--brand-text-secondary);
      padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; }
    .chip:hover { border-color: var(--brand-pink); color: var(--brand-pink); }
    .chip.on { background: linear-gradient(135deg, var(--brand-pink), var(--brand-lavender)); color: #fff; border-color: transparent; }

    .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
    .search { display: flex; align-items: center; gap: 8px; background: var(--mat-sys-surface);
      border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 8px 12px; flex: 1; min-width: 220px; max-width: 380px; }
    .search:focus-within { border-color: var(--brand-pink); box-shadow: 0 0 0 3px var(--brand-pink-light); }
    .search input { border: none; outline: none; background: transparent; width: 100%; font-size: 14px; }
    .search mat-icon { color: var(--brand-text-secondary); font-size: 20px; }
    .search .clear { cursor: pointer; }
    .sort-btn, .toolbar button { color: var(--brand-text-secondary); }

    .table-wrap { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; overflow: auto; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
    .tbl thead th { text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
      color: var(--brand-text-secondary); padding: 12px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); white-space: nowrap; }
    .tbl tbody td { padding: 10px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); vertical-align: middle; }
    .tbl tbody tr:last-child td { border-bottom: none; }
    .tbl tbody tr:hover { background: var(--mat-sys-surface-variant); }
    .num { text-align: right; }
    .muted { color: var(--brand-text-secondary); white-space: nowrap; }
    .prod-cell { display: flex; align-items: center; gap: 12px; min-width: 220px; }
    .thumb { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex: 0 0 auto; }
    .thumb.placeholder { display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #bbb; }
    .pname { color: var(--brand-text-primary); font-weight: 600; text-decoration: none; }
    .pname:hover { color: var(--brand-pink); }
    .strong { font-weight: 700; }
    .sale { color: var(--brand-pink); font-weight: 700; display: block; }
    .orig { font-size: 12px; color: var(--brand-text-secondary); text-decoration: line-through; }
    .stock.out { color: #b3261e; font-weight: 700; }
    .stock.low { color: #b5591a; font-weight: 700; }
    .badge { font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 10px; white-space: nowrap; }
    .badge.on { background: #dcefe4; color: #2f7d52; }
    .badge.off { background: #eeeeee; color: #777; }
    .actions { white-space: nowrap; text-align: right; }
    .empty { text-align: center; padding: 48px 20px; color: var(--brand-text-secondary); }
    .empty mat-icon { font-size: 42px; width: 42px; height: 42px; opacity: .4; }
    .empty p { margin: 8px 0 0; }
  `]
})
export class ProductList implements OnInit {
  private service = inject(ProductService);
  upload = inject(UploadService);
  private snack = inject(MatSnackBar);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  limit = 20;

  search = '';
  categoryId = '';
  activeFilter = '';
  sortBy: '_id' | 'price' | 'stock' | 'name' = '_id';
  sortDir: 'asc' | 'desc' = 'desc';

  sortOptions: SortOpt[] = [
    { value: 'newest', label: 'Mới nhất', sortBy: '_id', sortDir: 'desc' },
    { value: 'name', label: 'Tên A → Z', sortBy: 'name', sortDir: 'asc' },
    { value: 'price_desc', label: 'Giá cao → thấp', sortBy: 'price', sortDir: 'desc' },
    { value: 'price_asc', label: 'Giá thấp → cao', sortBy: 'price', sortDir: 'asc' },
    { value: 'stock_asc', label: 'Tồn kho thấp nhất', sortBy: 'stock', sortDir: 'asc' }
  ];
  currentSort = computed(() =>
    this.sortOptions.find((o) => o.sortBy === this.sortBy && o.sortDir === this.sortDir) ?? this.sortOptions[0]);
  categoryName = computed(() => {
    if (!this.categoryId) return 'Danh mục';
    return this.categories().find((c) => c._id === this.categoryId)?.category_name ?? 'Danh mục';
  });

  ngOnInit(): void {
    this.service.categories().subscribe((c) => this.categories.set(c));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const query: Record<string, unknown> = {
      page: this.page(), limit: this.limit, search: this.search, category_id: this.categoryId,
      sortBy: this.sortBy, sortDir: this.sortDir
    };
    if (this.activeFilter !== '') query['is_active'] = this.activeFilter === 'true';
    this.service.list(query).subscribe({
      next: (res) => { this.products.set(res.data); this.total.set(res.total); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  applyFilter(): void { this.page.set(1); this.load(); }
  setActive(v: string): void { this.activeFilter = v; this.applyFilter(); }
  setCategory(id: string): void { this.categoryId = id; this.applyFilter(); }
  setSort(o: SortOpt): void { this.sortBy = o.sortBy; this.sortDir = o.sortDir; this.applyFilter(); }
  onPage(e: PageEvent): void { this.limit = e.pageSize; this.page.set(e.pageIndex + 1); this.load(); }

  remove(p: Product): void {
    this.service.remove(p._id).subscribe(() => {
      this.snack.open('Đã ẩn sản phẩm', 'OK', { duration: 2500 });
      this.load();
    });
  }
  restore(p: Product): void {
    this.service.update(p._id, { is_active: true }).subscribe(() => {
      this.snack.open('Đã hiện lại sản phẩm', 'OK', { duration: 2500 });
      this.load();
    });
  }

  categoryOf(p: Product): string {
    if (p.category_id && typeof p.category_id === 'object') return (p.category_id as Category).category_name;
    return '—';
  }
}
