import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CommunityPost, Paginated, PostDetail } from '../models/models';

export interface PostQuery {
  page?: number;
  limit?: number;
  is_hidden?: boolean;
  post_type?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/community`;

  list(query: PostQuery = {}): Observable<Paginated<CommunityPost>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<Paginated<CommunityPost>>(`${this.api}/posts`, { params });
  }

  pending(page = 1, limit = 20): Observable<Paginated<CommunityPost>> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http.get<Paginated<CommunityPost>>(`${this.api}/posts/pending`, { params });
  }

  getById(id: string): Observable<PostDetail> {
    return this.http.get<PostDetail>(`${this.api}/posts/${id}`);
  }

  approve(id: string): Observable<{ message: string; post: CommunityPost }> {
    return this.http.put<{ message: string; post: CommunityPost }>(`${this.api}/posts/${id}/approve`, {});
  }

  reject(id: string, reason?: string): Observable<{ message: string; post: CommunityPost }> {
    return this.http.put<{ message: string; post: CommunityPost }>(`${this.api}/posts/${id}/reject`, { reason });
  }

  hide(id: string): Observable<{ message: string; post: CommunityPost }> {
    return this.http.put<{ message: string; post: CommunityPost }>(`${this.api}/posts/${id}/hide`, {});
  }
}
