import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Banner } from '../models/models';

@Injectable({ providedIn: 'root' })
export class BannerService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/banners`;

  list(): Observable<{ data: Banner[]; total: number }> {
    return this.http.get<{ data: Banner[]; total: number }>(this.api);
  }

  getById(id: string): Observable<Banner> {
    return this.http.get<Banner>(`${this.api}/${id}`);
  }

  create(body: Partial<Banner>): Observable<Banner> {
    return this.http.post<Banner>(this.api, body);
  }

  update(id: string, body: Partial<Banner>): Observable<Banner> {
    return this.http.put<Banner>(`${this.api}/${id}`, body);
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`${this.api}/${id}`);
  }
}
