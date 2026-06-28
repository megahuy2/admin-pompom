import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Paginated, User, UserDetail } from '../models/models';

export interface UserQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface NotificationInput {
  title: string;
  message?: string;
  type?: string;
  image_url?: string;
  action_url?: string;
  reference_id?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/users`;

  list(query: UserQuery = {}): Observable<Paginated<User>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<Paginated<User>>(this.api, { params });
  }

  getById(id: string): Observable<UserDetail> {
    return this.http.get<UserDetail>(`${this.api}/${id}`);
  }

  updateStatus(id: string, status: 'active' | 'locked'): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.api}/${id}/status`, { status });
  }

  sendNotification(id: string, body: NotificationInput): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${id}/notifications`, body);
  }
}
