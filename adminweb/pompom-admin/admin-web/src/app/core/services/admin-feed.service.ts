import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Paginated } from '../models/models';

export interface Reel {
  _id: string;
  source: 'instagram' | 'facebook' | 'tiktok' | 'youtube';
  source_url?: string;
  video_url: string;
  thumbnail_url?: string;
  caption?: string;
  hashtags?: string[];
  author?: { name?: string; handle?: string; avatar_url?: string; verified?: boolean };
  product_tags?: ({ _id: string; name: string } | string)[];
  duration?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface ReelPayload {
  source: string; source_url?: string; video_url: string; thumbnail_url?: string;
  caption?: string; hashtags?: string;
  author_name?: string; author_handle?: string; author_avatar?: string; author_verified?: boolean;
  is_active?: boolean;
}

export interface ConsultationRequest {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  skin_type?: string;
  topic?: string;
  message?: string;
  preferred_channel?: 'phone' | 'zalo' | 'messenger' | 'email';
  status: 'pending' | 'contacted' | 'done' | 'cancelled';
  created_at?: string;
  expert_id?: { _id: string; name: string; title?: string } | null;
  source_article_id?: { _id: string; title: string } | null;
  user_id?: { _id: string; full_name: string; email?: string } | null;
}

export interface ConsultationList extends Paginated<ConsultationRequest> {
  counts: { pending: number; contacted: number; done: number; cancelled: number };
}

@Injectable({ providedIn: 'root' })
export class AdminFeedService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/admin`;

  // ---- Reels ----
  listReels(query: { page?: number; limit?: number; source?: string; search?: string; is_active?: boolean } = {}): Observable<Paginated<Reel>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v)); });
    return this.http.get<Paginated<Reel>>(`${this.api}/reels`, { params });
  }
  createReel(body: ReelPayload): Observable<Reel> { return this.http.post<Reel>(`${this.api}/reels`, body); }
  updateReel(id: string, body: Partial<ReelPayload>): Observable<Reel> { return this.http.put<Reel>(`${this.api}/reels/${id}`, body); }
  deleteReel(id: string): Observable<{ message: string }> { return this.http.delete<{ message: string }>(`${this.api}/reels/${id}`); }

  // ---- Consultations ----
  listConsultations(query: { page?: number; limit?: number; status?: string; search?: string } = {}): Observable<ConsultationList> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v)); });
    return this.http.get<ConsultationList>(`${this.api}/consultations`, { params });
  }
  updateConsultation(id: string, status: string): Observable<{ message: string; data: ConsultationRequest }> {
    return this.http.put<{ message: string; data: ConsultationRequest }>(`${this.api}/consultations/${id}`, { status });
  }
  deleteConsultation(id: string): Observable<{ message: string }> { return this.http.delete<{ message: string }>(`${this.api}/consultations/${id}`); }
}
