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

  updateStatus(id: string, status: OrderStatus, note?: string): Observable<{ message: string; order: Order }> {
    return this.http.put<{ message: string; order: Order }>(`${this.api}/${id}/status`, { status, note });
  }

  confirmPayment(id: string): Observable<{ message: string; order: Order }> {
    return this.http.put<{ message: string; order: Order }>(`${this.api}/${id}/confirm-payment`, {});
  }
}
