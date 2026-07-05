import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminFeedService, ConsultationRequest } from '../../../core/services/admin-feed.service';

const STATUS_LABEL: Record<string, string> = { pending: 'Chờ liên hệ', contacted: 'Đã liên hệ', done: 'Hoàn tất', cancelled: 'Đã huỷ' };
const STATUS_CLS: Record<string, string> = { pending: 'st-pending', contacted: 'st-contacted', done: 'st-done', cancelled: 'st-cancelled' };
const SKIN: Record<string, string> = { dry: 'Da khô', oily: 'Da dầu', combination: 'Da hỗn hợp', sensitive: 'Da nhạy cảm', normal: 'Da thường' };
const CHANNEL: Record<string, string> = { phone: 'Gọi điện', zalo: 'Zalo', messenger: 'Messenger', email: 'Email' };

@Component({
  selector: 'app-consultation-list',
  imports: [FormsModule, DatePipe, MatButtonModule, MatIconModule, MatMenuModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule],
  template: `
    <div class="page-head">
      <div><h1>Liên hệ tư vấn</h1><p class="sub">Yêu cầu tư vấn người dùng gửi từ bài viết / bác sĩ</p></div>
    </div>

    <div class="chips">
      <button class="chip" [class.on]="status === ''" (click)="setStatus('')">Tất cả</button>
      <button class="chip st-pending" [class.on]="status === 'pending'" (click)="setStatus('pending')">Chờ liên hệ @if (counts().pending) { <b>{{ counts().pending }}</b> }</button>
      <button class="chip st-contacted" [class.on]="status === 'contacted'" (click)="setStatus('contacted')">Đã liên hệ @if (counts().contacted) { <b>{{ counts().contacted }}</b> }</button>
      <button class="chip st-done" [class.on]="status === 'done'" (click)="setStatus('done')">Hoàn tất @if (counts().done) { <b>{{ counts().done }}</b> }</button>
      <button class="chip st-cancelled" [class.on]="status === 'cancelled'" (click)="setStatus('cancelled')">Đã huỷ @if (counts().cancelled) { <b>{{ counts().cancelled }}</b> }</button>
    </div>

    <div class="toolbar">
      <div class="search">
        <mat-icon>search</mat-icon>
        <input [(ngModel)]="search" (keyup.enter)="applyFilter()" placeholder="Tìm theo tên / SĐT / email…" />
        @if (search) { <mat-icon class="clear" (click)="search=''; applyFilter()">close</mat-icon> }
      </div>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    <div class="table-wrap">
      <table class="tbl">
        <thead><tr><th>Khách</th><th>Liên hệ</th><th>Chủ đề / Nội dung</th><th>Từ bài viết</th><th>Trạng thái</th><th>Gửi lúc</th><th></th></tr></thead>
        <tbody>
          @for (c of items(); track c._id) {
            <tr>
              <td>
                <b>{{ c.name }}</b>
                @if (c.skin_type) { <span class="skin">{{ skin(c.skin_type) }}</span> }
                @if (c.user_id) { <div class="muted sm">TK: {{ c.user_id.full_name }}</div> }
              </td>
              <td>
                <div class="phone">{{ c.phone }}</div>
                @if (c.email) { <div class="muted sm">{{ c.email }}</div> }
                <div class="quick">
                  <a class="qbtn" [href]="'tel:' + c.phone" matTooltip="Gọi"><mat-icon>call</mat-icon></a>
                  <a class="qbtn" [href]="'https://zalo.me/' + c.phone" target="_blank" matTooltip="Zalo"><mat-icon>chat</mat-icon></a>
                  <button class="qbtn" (click)="copy(c.phone)" matTooltip="Copy SĐT"><mat-icon>content_copy</mat-icon></button>
                </div>
              </td>
              <td class="topic">
                @if (c.topic) { <b>{{ c.topic }}</b> }
                @if (c.message) { <p>{{ c.message }}</p> }
                <span class="chan">Muốn liên hệ qua: {{ channel(c.preferred_channel) }}</span>
              </td>
              <td class="muted sm">
                @if (c.source_article_id) { {{ c.source_article_id.title }} }
                @else if (c.expert_id) { BS. {{ c.expert_id.name }} }
                @else { — }
              </td>
              <td><span class="badge {{ cls(c.status) }}">{{ statusLabel(c.status) }}</span></td>
              <td class="muted sm">{{ c.created_at | date:'dd/MM/yy HH:mm' }}</td>
              <td class="actions">
                <button mat-stroked-button class="upd" [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="setState(c, 'contacted')"><mat-icon>call_made</mat-icon> Đánh dấu đã liên hệ</button>
                  <button mat-menu-item (click)="setState(c, 'done')"><mat-icon>check_circle</mat-icon> Hoàn tất</button>
                  <button mat-menu-item (click)="setState(c, 'pending')"><mat-icon>schedule</mat-icon> Chờ liên hệ</button>
                  <button mat-menu-item (click)="setState(c, 'cancelled')"><mat-icon>cancel</mat-icon> Huỷ</button>
                  <button mat-menu-item (click)="remove(c)"><mat-icon>delete</mat-icon> Xoá</button>
                </mat-menu>
              </td>
            </tr>
          }
        </tbody>
      </table>
      @if (!loading() && items().length === 0) { <div class="empty"><mat-icon>support_agent</mat-icon><p>Chưa có yêu cầu tư vấn nào.</p></div> }
    </div>

    <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page() - 1" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { margin: 0; } .sub { margin: 2px 0 14px; color: var(--brand-text-secondary); font-size: 13px; }
    .chips { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
    .chip { border: 1px solid var(--mat-sys-outline-variant); background: var(--mat-sys-surface); color: var(--brand-text-secondary); padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; }
    .chip b { background: var(--brand-pink); color: #fff; border-radius: 999px; padding: 1px 7px; font-size: 11px; margin-left: 4px; }
    .chip:hover { border-color: var(--brand-pink); } .chip.on { background: linear-gradient(135deg, var(--brand-pink), var(--brand-lavender)); color: #fff; border-color: transparent; } .chip.on b { background: rgba(255,255,255,.3); }
    .toolbar { margin-bottom: 14px; }
    .search { display: flex; align-items: center; gap: 8px; background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 8px 12px; max-width: 380px; }
    .search:focus-within { border-color: var(--brand-pink); box-shadow: 0 0 0 3px var(--brand-pink-light); }
    .search input { border: none; outline: none; background: transparent; width: 100%; font-size: 14px; } .search mat-icon { color: var(--brand-text-secondary); font-size: 20px; } .search .clear { cursor: pointer; }
    .table-wrap { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; overflow: auto; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
    .tbl thead th { text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--brand-text-secondary); padding: 12px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); white-space: nowrap; }
    .tbl tbody td { padding: 11px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); vertical-align: top; }
    .tbl tbody tr:last-child td { border-bottom: none; } .tbl tbody tr:hover { background: var(--mat-sys-surface-variant); }
    .muted { color: var(--brand-text-secondary); } .sm { font-size: 12px; }
    .skin { display: inline-block; font-size: 11px; font-weight: 600; background: var(--brand-lavender-light); color: #7a4f63; padding: 2px 8px; border-radius: 8px; margin-left: 6px; }
    .phone { font-weight: 600; font-family: monospace; }
    .quick { display: flex; gap: 6px; margin-top: 6px; }
    .qbtn { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--mat-sys-outline-variant); background: var(--brand-background); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--brand-pink); text-decoration: none; }
    .qbtn:hover { background: var(--brand-pink-light); } .qbtn mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .topic { max-width: 300px; } .topic b { font-size: 13px; } .topic p { margin: 3px 0; font-size: 13px; color: var(--brand-text-secondary); }
    .chan { font-size: 11px; color: var(--brand-pink); font-weight: 600; }
    .badge { font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 10px; white-space: nowrap; }
    .st-pending { background: #f8ebcf; color: #8a6d1a; } .st-contacted { background: #dbe7ff; color: #2f5bbd; } .st-done { background: #dcefe4; color: #2f7d52; } .st-cancelled { background: #eeeeee; color: #777; }
    .chip.st-pending, .chip.st-contacted, .chip.st-done, .chip.st-cancelled { background: var(--mat-sys-surface); }
    .actions { text-align: right; } .upd { min-width: 40px; padding: 0 8px; }
    .empty { text-align: center; padding: 48px; color: var(--brand-text-secondary); } .empty mat-icon { font-size: 42px; width: 42px; height: 42px; opacity: .4; }
  `]
})
export class ConsultationList implements OnInit {
  private service = inject(AdminFeedService);
  private snack = inject(MatSnackBar);

  items = signal<ConsultationRequest[]>([]);
  counts = signal<{ pending: number; contacted: number; done: number; cancelled: number }>({ pending: 0, contacted: 0, done: 0, cancelled: 0 });
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  limit = 20;
  status = '';
  search = '';

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    this.service.listConsultations({ page: this.page(), limit: this.limit, status: this.status, search: this.search }).subscribe({
      next: (res) => { this.items.set(res.data); this.total.set(res.total); this.counts.set(res.counts); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
  applyFilter(): void { this.page.set(1); this.load(); }
  setStatus(s: string): void { this.status = s; this.applyFilter(); }
  onPage(e: PageEvent): void { this.limit = e.pageSize; this.page.set(e.pageIndex + 1); this.load(); }

  setState(c: ConsultationRequest, status: string): void {
    this.service.updateConsultation(c._id, status).subscribe({
      next: (res) => { this.snack.open(res.message, 'OK', { duration: 2000 }); this.load(); },
      error: (err) => this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 })
    });
  }
  remove(c: ConsultationRequest): void {
    if (!confirm(`Xoá yêu cầu của "${c.name}"?`)) return;
    this.service.deleteConsultation(c._id).subscribe(() => { this.snack.open('Đã xoá', 'OK', { duration: 2000 }); this.load(); });
  }
  copy(text: string): void { navigator.clipboard?.writeText(text); this.snack.open('Đã copy SĐT', 'OK', { duration: 1500 }); }

  statusLabel(s: string): string { return STATUS_LABEL[s] ?? s; }
  cls(s: string): string { return STATUS_CLS[s] ?? ''; }
  skin(s?: string): string { return s ? (SKIN[s] ?? s) : ''; }
  channel(s?: string): string { return s ? (CHANNEL[s] ?? s) : '—'; }
}
