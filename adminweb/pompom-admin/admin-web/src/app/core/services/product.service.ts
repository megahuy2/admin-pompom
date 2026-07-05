import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, Paginated, Product } from '../models/models';

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: string;
  is_active?: boolean;
  sortBy?: '_id' | 'price' | 'stock' | 'name';
  sortDir?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/products`;

  list(query: ProductQuery = {}): Observable<Paginated<Product>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<Paginated<Product>>(this.api, { params });
  }

  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.api}/${id}`);
  }

  create(body: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.api, body);
  }

  update(id: string, body: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.api}/${id}`, body);
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`${this.api}/${id}`);
  }

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.api}/categories`);
  }
}
