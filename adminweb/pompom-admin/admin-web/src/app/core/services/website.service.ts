import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WebCollection {
  _id: string;
  name: string;
  image_url?: string;
  product_ids: string[];
  sort_order?: number;
  is_active?: boolean;
}

export interface QuickLink {
  _id: string;
  name: string;
  icon?: string;
  path?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface HomeSection {
  _id: string;
  name: string;
  content_type: 'banner' | 'products' | 'collections' | 'community';
  sort_order?: number;
  is_active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class WebsiteService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/website`;

  // Collections
  listCollections(): Observable<{ data: WebCollection[] }> { return this.http.get<{ data: WebCollection[] }>(`${this.api}/collections`); }
  createCollection(b: Partial<WebCollection>): Observable<WebCollection> { return this.http.post<WebCollection>(`${this.api}/collections`, b); }
  updateCollection(id: string, b: Partial<WebCollection>): Observable<WebCollection> { return this.http.put<WebCollection>(`${this.api}/collections/${id}`, b); }
  deleteCollection(id: string): Observable<{ message: string }> { return this.http.delete<{ message: string }>(`${this.api}/collections/${id}`); }

  // Quick links
  listQuickLinks(): Observable<{ data: QuickLink[] }> { return this.http.get<{ data: QuickLink[] }>(`${this.api}/quick-links`); }
  createQuickLink(b: Partial<QuickLink>): Observable<QuickLink> { return this.http.post<QuickLink>(`${this.api}/quick-links`, b); }
  updateQuickLink(id: string, b: Partial<QuickLink>): Observable<QuickLink> { return this.http.put<QuickLink>(`${this.api}/quick-links/${id}`, b); }
  deleteQuickLink(id: string): Observable<{ message: string }> { return this.http.delete<{ message: string }>(`${this.api}/quick-links/${id}`); }

  // Home sections
  listSections(): Observable<{ data: HomeSection[] }> { return this.http.get<{ data: HomeSection[] }>(`${this.api}/sections`); }
  createSection(b: Partial<HomeSection>): Observable<HomeSection> { return this.http.post<HomeSection>(`${this.api}/sections`, b); }
  updateSection(id: string, b: Partial<HomeSection>): Observable<HomeSection> { return this.http.put<HomeSection>(`${this.api}/sections/${id}`, b); }
  deleteSection(id: string): Observable<{ message: string }> { return this.http.delete<{ message: string }>(`${this.api}/sections/${id}`); }
}
