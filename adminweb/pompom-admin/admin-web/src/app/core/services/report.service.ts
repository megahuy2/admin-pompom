import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RevenueReport, TopProduct, TopCustomer, UserBehaviorReport } from '../models/models';

export interface RevenueQuery {
  from?: string;
  to?: string;
  groupBy?: 'day' | 'week' | 'month';
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/reports`;

  revenue(query: RevenueQuery = {}): Observable<RevenueReport> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<RevenueReport>(`${this.api}/revenue`, { params });
  }

  topProducts(limit = 10, from?: string, to?: string): Observable<{ data: TopProduct[] }> {
    let params = new HttpParams().set('limit', String(limit));
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<{ data: TopProduct[] }>(`${this.api}/top-products`, { params });
  }

  topCustomers(limit = 5, from?: string, to?: string): Observable<{ data: TopCustomer[] }> {
    let params = new HttpParams().set('limit', String(limit));
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<{ data: TopCustomer[] }>(`${this.api}/top-customers`, { params });
  }

  userBehavior(): Observable<UserBehaviorReport> {
    return this.http.get<UserBehaviorReport>(`${this.api}/user-behavior`);
  }
}
