import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardSummary } from '../models/models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/dashboard`;

  summary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.api}/summary`);
  }
}
