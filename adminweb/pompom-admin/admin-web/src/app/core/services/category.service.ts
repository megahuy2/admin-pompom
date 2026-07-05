import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/categories`;

  list(withCount = false): Observable<{ data: Category[]; total: number }> {
    let params = new HttpParams();
    if (withCount) params = params.set('withCount', 'true');
    return this.http.get<{ data: Category[]; total: number }>(this.api, { params });
  }

  getById(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.api}/${id}`);
  }

  create(body: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(this.api, body);
  }

  update(id: string, body: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.api}/${id}`, body);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }
}
