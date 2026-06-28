import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Comment, PostDetail as PostDetailModel } from '../../../core/models/models';
import { CommunityService } from '../../../core/services/community.service';

@Component({
  selector: 'app-post-detail',
  imports: [
    RouterLink, DatePipe,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatListModule, MatProgressBarModule
  ],
  template: `
    <div class="header">
      <button mat-icon-button routerLink="/community"><mat-icon>arrow_back</mat-icon></button>
      <h1>Chi tiết bài viết</h1>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    @if (post(); as p) {
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ authorName() }}</mat-card-title>
          <mat-card-subtitle>{{ p.created_at | date:'dd/MM/yyyy HH:mm' }} · {{ p.post_type }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="content">{{ p.content }}</p>
          @if (p.images?.length) {
            <div class="images">
              @for (img of p.images; track img) { <img [src]="img" alt="ảnh bài viết" /> }
            </div>
          }
          <p>
            <mat-chip [highlighted]="!p.is_hidden" [color]="p.is_hidden ? 'warn' : 'primary'">
              {{ p.is_hidden ? 'Đang ẩn / chờ duyệt' : 'Đang hiển thị' }}
            </mat-chip>
            <span class="muted">· {{ p.like_count }} thích · {{ p.comment_count }} bình luận</span>
          </p>
        </mat-card-content>
        <mat-card-actions>
          @if (p.is_hidden) {
            <button mat-flat-button color="primary" (click)="approve()" [disabled]="saving()">
              <mat-icon>check_circle</mat-icon> Duyệt bài
            </button>
          } @else {
            <button mat-flat-button color="warn" (click)="hide()" [disabled]="saving()">
              <mat-icon>visibility_off</mat-icon> Ẩn bài
            </button>
          }
        </mat-card-actions>
      </mat-card>

      <mat-card class="mt">
        <mat-card-header><mat-card-title>Bình luận ({{ p.comments.length }})</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (p.comments.length === 0) { <p class="muted">Chưa có bình luận.</p> }
          <mat-list>
            @for (c of p.comments; track c._id) {
              <mat-list-item>
                <b>{{ commentAuthor(c) }}:</b> {{ c.content }}
                <span class="muted"> · {{ c.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </mat-list-item>
            }
          </mat-list>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .header { display: flex; align-items: center; gap: 8px; }
    .content { font-size: 15px; white-space: pre-wrap; }
    .images { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
    .images img { width: 120px; height: 120px; object-fit: cover; border-radius: 8px; }
    .mt { margin-top: 16px; }
    .muted { color: #777; }
  `]
})
export class PostDetail implements OnInit {
  private service = inject(CommunityService);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  post = signal<PostDetailModel | null>(null);
  loading = signal(false);
  saving = signal(false);
  private id = '';

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getById(this.id).subscribe({
      next: (p) => {
        this.post.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  approve(): void {
    this.saving.set(true);
    this.service.approve(this.id).subscribe(() => {
      this.saving.set(false);
      this.snack.open('Đã duyệt bài viết', 'OK', { duration: 2500 });
      this.load();
    });
  }

  hide(): void {
    this.saving.set(true);
    this.service.hide(this.id).subscribe(() => {
      this.saving.set(false);
      this.snack.open('Đã ẩn bài viết', 'OK', { duration: 2500 });
      this.load();
    });
  }

  authorName(): string {
    const p = this.post();
    if (p?.user_id && typeof p.user_id === 'object') return p.user_id.full_name;
    return '(ẩn danh)';
  }

  commentAuthor(c: Comment): string {
    if (c.user_id && typeof c.user_id === 'object') return c.user_id.full_name;
    return '(ẩn danh)';
  }
}
