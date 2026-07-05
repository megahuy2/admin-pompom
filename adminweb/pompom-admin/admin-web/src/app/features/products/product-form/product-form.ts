import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Category, Product, ProductImage } from '../../../core/models/models';
import { ProductService } from '../../../core/services/product.service';
import { UploadService } from '../../../core/services/upload.service';

@Component({
  selector: 'app-product-form',
  imports: [
    ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatCheckboxModule, MatProgressBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="header">
      <button mat-icon-button routerLink="/products"><mat-icon>arrow_back</mat-icon></button>
      <h1>{{ isEdit() ? 'Sửa sản phẩm' : 'Thêm sản phẩm' }}</h1>
    </div>

    <mat-card>
      @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
          <mat-form-field appearance="outline" class="col-2">
            <mat-label>Tên sản phẩm</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Slug</mat-label>
            <input matInput formControlName="slug" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>SKU</mat-label>
            <input matInput formControlName="sku" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Giá</mat-label>
            <input matInput type="number" formControlName="price" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Giá khuyến mãi</mat-label>
            <input matInput type="number" formControlName="sale_price" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tồn kho</mat-label>
            <input matInput type="number" formControlName="stock" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Danh mục</mat-label>
            <mat-select formControlName="category_id">
              @for (c of categories(); track c._id) {
                <mat-option [value]="c._id">{{ c.category_name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Thương hiệu</mat-label>
            <input matInput formControlName="brand" />
          </mat-form-field>
          <div class="check col-2">
            <mat-checkbox formControlName="is_active">Đang bán</mat-checkbox>
          </div>

          <mat-form-field appearance="outline" class="col-2">
            <mat-label>Mô tả</mat-label>
            <textarea matInput rows="4" formControlName="description"></textarea>
          </mat-form-field>

          @if (error()) { <p class="error col-2">{{ error() }}</p> }

          <div class="actions col-2">
            <button mat-stroked-button type="button" routerLink="/products">Hủy</button>
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading()">Lưu</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    @if (isEdit()) {
      <mat-card class="img-card">
        <mat-card-header><mat-card-title>Ảnh sản phẩm</mat-card-title></mat-card-header>
        <mat-card-content>
          <!-- Chọn file + preview trước khi upload -->
          <div class="upload-row">
            <input #fileInput type="file" hidden multiple accept="image/*" (change)="onFilesSelected($event)" />
            <button mat-stroked-button type="button" (click)="fileInput.click()" [disabled]="uploading()">
              <mat-icon>add_photo_alternate</mat-icon> Chọn ảnh
            </button>
            <button mat-flat-button color="primary" type="button"
              (click)="uploadImages()" [disabled]="selectedFiles().length === 0 || uploading()">
              <mat-icon>cloud_upload</mat-icon> Upload ảnh
            </button>
            @if (uploading()) { <mat-spinner diameter="24"></mat-spinner> }
          </div>

          @if (uploadError()) { <p class="error">{{ uploadError() }}</p> }

          @if (previews().length) {
            <p class="section-label">Ảnh sắp upload ({{ previews().length }})</p>
            <div class="img-grid">
              @for (src of previews(); track $index) {
                <div class="img-item preview"><img [src]="src" alt="preview" /></div>
              }
            </div>
          }

          <p class="section-label">Ảnh hiện có</p>
          @if (images().length) {
            <div class="img-grid">
              @for (img of images(); track img._id) {
                <div class="img-item">
                  <img [src]="upload.resolveUrl(img.image_url)" alt="ảnh sản phẩm" />
                  <button mat-icon-button color="warn" class="del" type="button"
                    (click)="deleteImage(img)" [disabled]="uploading()" title="Xóa ảnh">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </div>
          } @else {
            <p class="empty">Chưa có ảnh nào.</p>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .header { display: flex; align-items: center; gap: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .col-2 { grid-column: 1 / -1; }
    .check { display: flex; align-items: center; margin-bottom: 16px; }
    .actions { display: flex; justify-content: flex-end; gap: 12px; }
    .error { color: var(--mat-sys-error); }
    mat-form-field { width: 100%; }
    .img-card { margin-top: 16px; }
    .upload-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .section-label { font-weight: 500; margin: 16px 0 8px; }
    .img-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .img-item { position: relative; width: 120px; height: 120px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .img-item img { width: 100%; height: 100%; object-fit: cover; }
    .img-item.preview { border-style: dashed; opacity: 0.85; }
    .img-item .del { position: absolute; top: 2px; right: 2px; background: rgba(255,255,255,0.85); }
    .empty { color: #777; }
  `]
})
export class ProductForm implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(ProductService);
  upload = inject(UploadService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  categories = signal<Category[]>([]);
  loading = signal(false);
  error = signal('');
  isEdit = signal(false);
  private id: string | null = null;

  // Quản lý ảnh
  images = signal<ProductImage[]>([]);
  selectedFiles = signal<File[]>([]);
  previews = signal<string[]>([]);
  uploading = signal(false);
  uploadError = signal('');

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    sku: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    sale_price: [null as number | null],
    stock: [0, Validators.min(0)],
    category_id: ['', Validators.required],
    brand: ['PomPom'],
    is_active: [true],
    description: ['']
  });

  ngOnInit(): void {
    this.service.categories().subscribe((c) => this.categories.set(c));
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.isEdit.set(true);
      this.loading.set(true);
      this.service.getById(this.id).subscribe({
        next: (p: Product) => {
          const categoryId = typeof p.category_id === 'string' ? p.category_id : p.category_id?._id;
          this.form.patchValue({ ...p, category_id: categoryId ?? '' });
          this.images.set(p.images ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const body = this.form.getRawValue();
    const req = this.isEdit() && this.id
      ? this.service.update(this.id, body)
      : this.service.create(body);
    const wasEdit = this.isEdit();
    req.subscribe({
      next: (res: Product) => {
        this.loading.set(false);
        if (wasEdit) {
          this.snack.open('Đã cập nhật sản phẩm', 'OK', { duration: 2500 });
          this.router.navigate(['/products']);
        } else {
          // Sau khi tạo, chuyển sang trang Sửa của sản phẩm mới để thêm ảnh ngay
          this.snack.open('Đã tạo sản phẩm — hãy thêm ảnh bên dưới', 'OK', { duration: 3000 });
          this.router.navigate(['/products', res._id, 'edit']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? err?.error?.message ?? 'Lưu thất bại');
      }
    });
  }

  /** Chọn file -> tạo preview bằng object URL */
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.revokePreviews();
    this.selectedFiles.set(files);
    this.previews.set(files.map((f) => URL.createObjectURL(f)));
    this.uploadError.set('');
    input.value = ''; // cho phép chọn lại cùng file
  }

  /** Upload các file đã chọn, sau đó load lại sản phẩm để lấy danh sách ảnh mới nhất */
  uploadImages(): void {
    if (!this.id || this.selectedFiles().length === 0) return;
    this.uploading.set(true);
    this.uploadError.set('');
    this.upload.uploadProductImages(this.id, this.selectedFiles()).subscribe({
      next: () => {
        this.clearSelection();
        this.refreshImages();
        this.snack.open('Đã upload ảnh', 'OK', { duration: 2500 });
      },
      error: (err) => {
        this.uploading.set(false);
        this.uploadError.set(err?.error?.error ?? err?.error?.message ?? 'Upload ảnh thất bại');
      }
    });
  }

  /** Xóa 1 ảnh đã có */
  deleteImage(img: ProductImage): void {
    this.uploading.set(true);
    this.upload.deleteProductImage(img._id).subscribe({
      next: () => {
        this.images.update((list) => list.filter((i) => i._id !== img._id));
        this.uploading.set(false);
        this.snack.open('Đã xóa ảnh', 'OK', { duration: 2500 });
      },
      error: (err) => {
        this.uploading.set(false);
        this.uploadError.set(err?.error?.error ?? err?.error?.message ?? 'Xóa ảnh thất bại');
      }
    });
  }

  private refreshImages(): void {
    if (!this.id) return;
    this.service.getById(this.id).subscribe({
      next: (p) => {
        this.images.set(p.images ?? []);
        this.uploading.set(false);
      },
      error: () => this.uploading.set(false)
    });
  }

  private clearSelection(): void {
    this.revokePreviews();
    this.selectedFiles.set([]);
    this.previews.set([]);
  }

  private revokePreviews(): void {
    this.previews().forEach((url) => URL.revokeObjectURL(url));
  }
}
