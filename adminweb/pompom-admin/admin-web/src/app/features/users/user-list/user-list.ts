import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { User } from '../../../core/models/models';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-user-list',
  imports: [
    RouterLink, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatChipsModule, MatPaginatorModule, MatProgressBarModule
  ],
  template: `
    <h1>Người dùng</h1>

    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>Tìm theo tên / email</mat-label>
        <input matInput [(ngModel)]="search" (keyup.enter)="applyFilter()" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Vai trò</mat-label>
        <mat-select [(ngModel)]="role" (selectionChange)="applyFilter()">
          <mat-option [value]="''">Tất cả</mat-option>
          <mat-option value="user">User</mat-option>
          <mat-option value="admin">Admin</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Trạng thái</mat-label>
        <mat-select [(ngModel)]="status" (selectionChange)="applyFilter()">
          <mat-option [value]="''">Tất cả</mat-option>
          <mat-option value="active">Hoạt động</mat-option>
          <mat-option value="locked">Đã khóa</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    <table mat-table [dataSource]="users()" class="mat-elevation-z1 table">
      <ng-container matColumnDef="full_name">
        <th mat-header-cell *matHeaderCellDef>Họ tên</th>
        <td mat-cell *matCellDef="let u">{{ u.full_name }}</td>
      </ng-container>
      <ng-container matColumnDef="email">
        <th mat-header-cell *matHeaderCellDef>Email</th>
        <td mat-cell *matCellDef="let u">{{ u.email }}</td>
      </ng-container>
      <ng-container matColumnDef="role">
        <th mat-header-cell *matHeaderCellDef>Vai trò</th>
        <td mat-cell *matCellDef="let u">{{ u.role }}</td>
      </ng-container>
      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
        <td mat-cell *matCellDef="let u">
          <mat-chip [highlighted]="u.status === 'active'" [color]="u.status === 'active' ? 'primary' : 'warn'">
            {{ u.status === 'active' ? 'Hoạt động' : 'Đã khóa' }}
          </mat-chip>
        </td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let u">
          <button mat-icon-button [routerLink]="['/users', u._id]" title="Chi tiết"><mat-icon>visibility</mat-icon></button>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns;"></tr>
    </table>

    @if (!loading() && users().length === 0) { <p class="empty">Không có người dùng nào.</p> }

    <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page() - 1"
      [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
  `,
  styles: [`
    .filters { display: flex; gap: 12px; align-items: center; margin: 12px 0; flex-wrap: wrap; }
    .table { width: 100%; }
    .empty { text-align: center; color: #777; padding: 24px; }
  `]
})
export class UserList implements OnInit {
  private service = inject(UserService);

  users = signal<User[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  limit = 20;

  search = '';
  role = '';
  status = '';
  columns = ['full_name', 'email', 'role', 'status', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list({ page: this.page(), limit: this.limit, search: this.search, role: this.role, status: this.status })
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
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
}
