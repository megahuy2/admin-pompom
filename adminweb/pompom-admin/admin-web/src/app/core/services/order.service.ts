import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, OrderDetail, OrderStatus, Paginated } from '../models/models';

export interface OrderQuery {
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
  sortBy?: 'created_at' | 'final_amount' | 'order_number' | 'status';
  sortDir?: 'asc' | 'desc';
}

export interface CreateOrderPayload {
  user_id?: string | null;
  items: { product_id: string; quantity: number }[];
  payment_method: string;
  shipping_fee?: number;
  discount_amount?: number;
  note?: string;
}

export interface ImportRow {
  customer_email?: string;
  product_sku: string;
  quantity: number;
  payment_method?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/orders`;

  list(query: OrderQuery = {}): Observable<Paginated<Order>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<Paginated<Order>>(this.api, { params });
  }

  getById(id: string): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.api}/${id}`);
  }

  create(payload: CreateOrderPayload): Observable<{ message: string; order: Order }> {
    return this.http.post<{ message: string; order: Order }>(this.api, payload);
  }

  updateStatus(id: string, status: OrderStatus, note?: string): Observable<{ message: string; order: Order }> {
    return this.http.put<{ message: string; order: Order }>(`${this.api}/${id}/status`, { status, note });
  }

  bulkStatus(ids: string[], status: OrderStatus, note?: string): Observable<{ message: string; updated: number; skipped: string[] }> {
    return this.http.put<{ message: string; updated: number; skipped: string[] }>(`${this.api}/bulk-status`, { ids, status, note });
  }

  importOrders(rows: ImportRow[]): Observable<{ message: string; created: number; errors: { row: number; message: string }[] }> {
    return this.http.post<{ message: string; created: number; errors: { row: number; message: string }[] }>(`${this.api}/import`, { rows });
  }

  confirmPayment(id: string): Observable<{ message: string; order: Order }> {
    return this.http.put<{ message: string; order: Order }>(`${this.api}/${id}/confirm-payment`, {});
  }
}
