import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProductImage } from '../models/models';

/**
 * Service dùng chung cho việc upload / xóa ảnh.
 * Hiện hỗ trợ ảnh sản phẩm; có thể tái dùng cho avatar, bài viết community sau này
 * bằng cách thêm method tương ứng (uploadAvatar, uploadPostImages, ...).
 */
@Injectable({ providedIn: 'root' })
export class UploadService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/upload`;
  // Gốc server (bỏ phần "/api") để dựng URL đầy đủ cho ảnh trả về dạng đường dẫn tương đối
  private readonly origin = environment.apiUrl.replace(/\/api\/?$/, '');

  /**
   * Upload nhiều ảnh cho 1 sản phẩm.
   * Backend: POST /api/upload/product/:productId, field 'images', multipart/form-data.
   * Không tự set Content-Type — để trình duyệt tự thêm boundary cho multipart.
   * (authInterceptor đã tự gắn Bearer token cho mọi request.)
   */
  uploadProductImages(productId: string, files: File[]): Observable<{ images: ProductImage[] }> {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return this.http.post<{ images: ProductImage[] }>(`${this.api}/product/${productId}`, form);
  }

  /**
   * Xóa 1 ảnh sản phẩm theo id.
   * Backend: DELETE /api/upload/product-image/:imageId
   */
  deleteProductImage(imageId: string): Observable<unknown> {
    return this.http.delete(`${this.api}/product-image/${imageId}`);
  }

  /**
   * Dựng URL hiển thị từ image_url backend trả về.
   * Nếu đã là URL tuyệt đối (http...) thì giữ nguyên, ngược lại ghép với gốc server.
   */
  resolveUrl(imageUrl: string): string {
    if (!imageUrl) return '';
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
    return `${this.origin}/${imageUrl.replace(/^\//, '')}`;
  }
}
