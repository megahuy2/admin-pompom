import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Voucher, Paginated } from '../models/models';

export interface VoucherQuery {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  status?: 'active' | 'upcoming' | 'expired';
}

@Injectable({ providedIn: 'root' })
export class VoucherService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/vouchers`;

  list(query: VoucherQuery = {}): Observable<Paginated<Voucher>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<Paginated<Voucher>>(this.api, { params });
  }

  getById(id: string): Observable<Voucher> {
    return this.http.get<Voucher>(`${this.api}/${id}`);
  }

  create(body: Partial<Voucher>): Observable<Voucher> {
    return this.http.post<Voucher>(this.api, body);
  }

  update(id: string, body: Partial<Voucher>): Observable<Voucher> {
    return this.http.put<Voucher>(`${this.api}/${id}`, body);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }
}
