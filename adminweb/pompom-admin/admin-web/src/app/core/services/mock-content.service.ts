import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// ============================================================================
// MOCK - chưa kết nối backend thật, chỉ demo UI cho đồ án.
// Collection / Quick Links / Section Home KHÔNG có trong ERD/35 bảng MongoDB.
// Dữ liệu là tĩnh, mọi thao tác thêm/sửa/xóa chỉ tác động lên local state trong
// service này (BehaviorSubject) — KHÔNG persist, refresh trang sẽ mất.
// ============================================================================

export interface MockCollection {
  id: string;
  name: string;
  image_url: string;
  productIds: string[]; // danh sách sản phẩm liên kết (mock - chỉ là id giả)
}

export interface MockQuickLink {
  id: string;
  name: string;
  icon: string;   // tên Material icon
  path: string;   // đường dẫn
}

export interface MockSection {
  id: string;
  name: string;
  order: number;
  contentType: 'banner' | 'products' | 'collections' | 'community';
}

const genId = () => 'mock-' + Math.random().toString(36).slice(2, 9);

@Injectable({ providedIn: 'root' })
export class MockContentService {
  // --- Collections ----------------------------------------------------------
  private collections$ = new BehaviorSubject<MockCollection[]>([
    { id: genId(), name: 'Bộ sưu tập Mùa hè', image_url: 'https://res.cloudinary.com/dwu6e0ian/image/upload/v1781344406/PomPom_Velvet_Rose_Lipstick_vjgkow.webp', productIds: ['p1', 'p2', 'p3'] },
    { id: genId(), name: 'Son môi bán chạy', image_url: 'https://res.cloudinary.com/dwu6e0ian/image/upload/v1781344101/PomPom_Honey_Lip_Mask_knj4ek.webp', productIds: ['p4', 'p5'] },
    { id: genId(), name: 'Quà tặng đặc biệt', image_url: 'https://res.cloudinary.com/dwu6e0ian/image/upload/v1781344230/PomPom_Makeup_Sponge_Set_a0qzcx.webp', productIds: ['p6'] }
  ]);

  // --- Quick Links ----------------------------------------------------------
  private quickLinks$ = new BehaviorSubject<MockQuickLink[]>([
    { id: genId(), name: 'Khuyến mãi', icon: 'local_offer', path: '/sale' },
    { id: genId(), name: 'Sản phẩm mới', icon: 'fiber_new', path: '/new-arrivals' },
    { id: genId(), name: 'Bán chạy', icon: 'trending_up', path: '/best-sellers' },
    { id: genId(), name: 'Cộng đồng', icon: 'forum', path: '/community' }
  ]);

  // --- Section Home ---------------------------------------------------------
  private sections$ = new BehaviorSubject<MockSection[]>([
    { id: genId(), name: 'Banner đầu trang', order: 1, contentType: 'banner' },
    { id: genId(), name: 'Sản phẩm nổi bật', order: 2, contentType: 'products' },
    { id: genId(), name: 'Bộ sưu tập', order: 3, contentType: 'collections' },
    { id: genId(), name: 'Bài viết cộng đồng', order: 4, contentType: 'community' }
  ]);

  // --- Collections API (MOCK) ----------------------------------------------
  getCollections(): Observable<MockCollection[]> { return this.collections$.asObservable(); }
  addCollection(item: Omit<MockCollection, 'id'>): void {
    this.collections$.next([...this.collections$.value, { ...item, id: genId() }]);
  }
  updateCollection(item: MockCollection): void {
    this.collections$.next(this.collections$.value.map((x) => (x.id === item.id ? item : x)));
  }
  deleteCollection(id: string): void {
    this.collections$.next(this.collections$.value.filter((x) => x.id !== id));
  }

  // --- Quick Links API (MOCK) ----------------------------------------------
  getQuickLinks(): Observable<MockQuickLink[]> { return this.quickLinks$.asObservable(); }
  addQuickLink(item: Omit<MockQuickLink, 'id'>): void {
    this.quickLinks$.next([...this.quickLinks$.value, { ...item, id: genId() }]);
  }
  updateQuickLink(item: MockQuickLink): void {
    this.quickLinks$.next(this.quickLinks$.value.map((x) => (x.id === item.id ? item : x)));
  }
  deleteQuickLink(id: string): void {
    this.quickLinks$.next(this.quickLinks$.value.filter((x) => x.id !== id));
  }

  // --- Sections API (MOCK) -------------------------------------------------
  getSections(): Observable<MockSection[]> { return this.sections$.asObservable(); }
  addSection(item: Omit<MockSection, 'id'>): void {
    this.sections$.next([...this.sections$.value, { ...item, id: genId() }]);
  }
  updateSection(item: MockSection): void {
    this.sections$.next(this.sections$.value.map((x) => (x.id === item.id ? item : x)));
  }
  deleteSection(id: string): void {
    this.sections$.next(this.sections$.value.filter((x) => x.id !== id));
  }
}
