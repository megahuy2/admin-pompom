import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Category, Product } from '../../../core/models/models';
import { ProductService } from '../../../core/services/product.service';
import { UploadService } from '../../../core/services/upload.service';

@Component({
  selector: 'app-product-list',
  imports: [
    RouterLink, FormsModule, DecimalPipe,
    MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatChipsModule, MatPaginatorModule, MatProgressBarModule
  ],
  template: `
    <div class="header">
      <h1>Sản phẩm</h1>
      <button mat-flat-button color="primary" routerLink="/products/new">
        <mat-icon>add</mat-icon> Thêm sản phẩm
      </button>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>Tìm theo tên</mat-label>
        <input matInput [(ngModel)]="search" (keyup.enter)="applyFilter()" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Danh mục</mat-label>
        <mat-select [(ngModel)]="categoryId" (selectionChange)="applyFilter()">
          <mat-option [value]="''">Tất cả</mat-option>
          @for (c of categories(); track c._id) {
            <mat-option [value]="c._id">{{ c.category_name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <button mat-stroked-button (click)="applyFilter()"><mat-icon>search</mat-icon> Lọc</button>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    <table mat-table [dataSource]="products()" class="mat-elevation-z1 table">
      <ng-container matColumnDef="image">
        <th mat-header-cell *matHeaderCellDef>Ảnh</th>
        <td mat-cell *matCellDef="let p">
          @if (p.images?.[0]?.image_url) {
            <img class="thumb" [src]="upload.resolveUrl(p.images[0].image_url)" alt="{{ p.name }}" />
          } @else {
            <div class="thumb placeholder"><mat-icon>image_not_supported</mat-icon></div>
          }
        </td>
      </ng-container>
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Tên</th>
        <td mat-cell *matCellDef="let p">{{ p.name }}</td>
      </ng-container>
      <ng-container matColumnDef="sku">
        <th mat-header-cell *matHeaderCellDef>SKU</th>
        <td mat-cell *matCellDef="let p">{{ p.sku }}</td>
      </ng-container>
      <ng-container matColumnDef="price">
        <th mat-header-cell *matHeaderCellDef>Giá</th>
        <td mat-cell *matCellDef="let p">{{ p.price | number }} ₫</td>
      </ng-container>
      <ng-container matColumnDef="stock">
        <th mat-header-cell *matHeaderCellDef>Tồn kho</th>
        <td mat-cell *matCellDef="let p">{{ p.stock }}</td>
      </ng-container>
      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
        <td mat-cell *matCellDef="let p">
          <mat-chip [highlighted]="p.is_active" [color]="p.is_active ? 'primary' : 'warn'">
            {{ p.is_active ? 'Đang bán' : 'Đã ẩn' }}
          </mat-chip>
        </td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let p">
          <button mat-icon-button [routerLink]="['/products', p._id, 'edit']" title="Sửa"><mat-icon>edit</mat-icon></button>
          @if (p.is_active) {
            <button mat-icon-button color="warn" (click)="remove(p)" title="Ẩn"><mat-icon>delete</mat-icon></button>
          }
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns;"></tr>
    </table>

    @if (!loading() && products().length === 0) { <p class="empty">Không có sản phẩm nào.</p> }

    <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page() - 1"
      [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; }
    .filters { display: flex; gap: 12px; align-items: center; margin: 12px 0; flex-wrap: wrap; }
    .table { width: 100%; }
    .empty { text-align: center; color: #777; padding: 24px; }
    .thumb { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; display: block; }
    .thumb.placeholder { display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #bbb; }
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
  columns = ['image', 'name', 'sku', 'price', 'stock', 'status', 'actions'];

  ngOnInit(): void {
    this.service.categories().subscribe((c) => this.categories.set(c));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list({ page: this.page(), limit: this.limit, search: this.search, category_id: this.categoryId })
      .subscribe({
        next: (res) => {
          this.products.set(res.data);
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

  remove(p: Product): void {
    this.service.remove(p._id).subscribe(() => {
      this.snack.open('Đã ẩn sản phẩm', 'OK', { duration: 2500 });
      this.load();
    });
  }
}
