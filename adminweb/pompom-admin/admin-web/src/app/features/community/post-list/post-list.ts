import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommunityPost } from '../../../core/models/models';
import { CommunityService } from '../../../core/services/community.service';

@Component({
  selector: 'app-post-list',
  imports: [
    RouterLink, FormsModule, DatePipe,
    MatTableModule, MatButtonModule, MatIconModule, MatButtonToggleModule,
    MatChipsModule, MatPaginatorModule, MatProgressBarModule
  ],
  template: `
    <h1>Cộng đồng</h1>

    <mat-button-toggle-group [(ngModel)]="filter" (change)="applyFilter()" class="toggle">
      <mat-button-toggle value="pending">Chờ duyệt</mat-button-toggle>
      <mat-button-toggle value="visible">Đang hiển thị</mat-button-toggle>
      <mat-button-toggle value="all">Tất cả</mat-button-toggle>
    </mat-button-toggle-group>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    <table mat-table [dataSource]="posts()" class="mat-elevation-z1 table">
      <ng-container matColumnDef="author">
        <th mat-header-cell *matHeaderCellDef>Tác giả</th>
        <td mat-cell *matCellDef="let p">{{ authorName(p) }}</td>
      </ng-container>
      <ng-container matColumnDef="content">
        <th mat-header-cell *matHeaderCellDef>Nội dung</th>
        <td mat-cell *matCellDef="let p" class="content-cell">{{ p.content }}</td>
      </ng-container>
      <ng-container matColumnDef="post_type">
        <th mat-header-cell *matHeaderCellDef>Loại</th>
        <td mat-cell *matCellDef="let p">{{ p.post_type }}</td>
      </ng-container>
      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
        <td mat-cell *matCellDef="let p">
          <mat-chip [highlighted]="!p.is_hidden" [color]="p.is_hidden ? 'warn' : 'primary'">
            {{ p.is_hidden ? 'Đang ẩn' : 'Hiển thị' }}
          </mat-chip>
        </td>
      </ng-container>
      <ng-container matColumnDef="created_at">
        <th mat-header-cell *matHeaderCellDef>Ngày</th>
        <td mat-cell *matCellDef="let p">{{ p.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let p">
          <button mat-icon-button [routerLink]="['/community', p._id]" title="Xem"><mat-icon>visibility</mat-icon></button>
          @if (p.is_hidden) {
            <button mat-icon-button color="primary" (click)="approve(p)" title="Duyệt"><mat-icon>check_circle</mat-icon></button>
          } @else {
            <button mat-icon-button color="warn" (click)="hide(p)" title="Ẩn"><mat-icon>visibility_off</mat-icon></button>
          }
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns;"></tr>
    </table>

    @if (!loading() && posts().length === 0) { <p class="empty">Không có bài viết nào.</p> }

    <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page() - 1"
      [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
  `,
  styles: [`
    .toggle { margin: 12px 0; }
    .table { width: 100%; }
    .content-cell { max-width: 360px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .empty { text-align: center; color: #777; padding: 24px; }
  `]
})
export class PostList implements OnInit {
  private service = inject(CommunityService);
  private snack = inject(MatSnackBar);

  posts = signal<CommunityPost[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  limit = 20;

  filter: 'pending' | 'visible' | 'all' = 'pending';
  columns = ['author', 'content', 'post_type', 'status', 'created_at', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const is_hidden = this.filter === 'all' ? undefined : this.filter === 'pending';
    this.service.list({ page: this.page(), limit: this.limit, is_hidden })
      .subscribe({
        next: (res) => {
          this.posts.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  applyFilter(): void {
    this.page.set(1);
    this.load();
  }

  onPage(e: PageEvent): void {
    this.limit = e.pageSize;
    this.page.set(e.pageIndex + 1);
    this.load();
  }

  approve(p: CommunityPost): void {
    this.service.approve(p._id).subscribe(() => {
      this.snack.open('Đã duyệt bài viết', 'OK', { duration: 2500 });
      this.load();
    });
  }

  hide(p: CommunityPost): void {
    this.service.hide(p._id).subscribe(() => {
      this.snack.open('Đã ẩn bài viết', 'OK', { duration: 2500 });
      this.load();
    });
  }

  authorName(p: CommunityPost): string {
    if (p.user_id && typeof p.user_id === 'object') return p.user_id.full_name;
    return '(ẩn danh)';
  }
}
