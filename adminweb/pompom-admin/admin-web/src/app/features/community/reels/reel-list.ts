import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminFeedService, Reel, ReelPayload } from '../../../core/services/admin-feed.service';

const SRC_LABEL: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube' };

@Component({
  selector: 'app-reel-list',
  imports: [FormsModule, DecimalPipe, DatePipe, MatButtonModule, MatIconModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule],
  template: `
    <div class="page-head">
      <div><h1>Reels</h1><p class="sub">{{ total() | number }} thước phim từ mạng xã hội</p></div>
      <button mat-flat-button class="primary" (click)="openCreate()"><mat-icon>add</mat-icon> Thêm reel</button>
    </div>

    <div class="chips">
      <button class="chip" [class.on]="source === ''" (click)="setSource('')">Tất cả nguồn</button>
      @for (s of sources; track s) { <button class="chip" [class.on]="source === s" (click)="setSource(s)">{{ label(s) }}</button> }
    </div>

    <div class="toolbar">
      <div class="search">
        <mat-icon>search</mat-icon>
        <input [(ngModel)]="search" (keyup.enter)="applyFilter()" placeholder="Tìm theo caption…" />
        @if (search) { <mat-icon class="clear" (click)="search=''; applyFilter()">close</mat-icon> }
      </div>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    <div class="table-wrap">
      <table class="tbl">
        <thead><tr><th>Video</th><th>Nguồn / Tác giả</th><th>Caption</th><th class="num">Lượt xem</th><th class="num">Thích</th><th>Trạng thái</th><th>Ngày</th><th></th></tr></thead>
        <tbody>
          @for (r of reels(); track r._id) {
            <tr>
              <td>
                <video class="vid" [src]="r.video_url" muted playsinline preload="metadata"
                  [poster]="r.thumbnail_url || ''" (mouseenter)="play($event)" (mouseleave)="stop($event)"></video>
              </td>
              <td>
                <span class="srcbadge {{ r.source }}">{{ label(r.source) }}</span>
                <div class="author">{{ r.author?.handle || r.author?.name || '—' }} @if (r.author?.verified) { <mat-icon class="verified">verified</mat-icon> }</div>
              </td>
              <td class="cap">{{ r.caption || '—' }}</td>
              <td class="num">{{ kfmt(r.view_count) }}</td>
              <td class="num">{{ kfmt(r.like_count) }}</td>
              <td><span class="badge" [class.on]="r.is_active" [class.off]="!r.is_active">{{ r.is_active ? 'Hiển thị' : 'Ẩn' }}</span></td>
              <td class="muted">{{ r.created_at | date:'dd/MM/yy' }}</td>
              <td class="actions">
                <button mat-icon-button (click)="openEdit(r)" matTooltip="Sửa"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button (click)="remove(r)" matTooltip="Xoá"><mat-icon>delete</mat-icon></button>
              </td>
            </tr>
          }
        </tbody>
      </table>
      @if (!loading() && reels().length === 0) { <div class="empty"><mat-icon>movie</mat-icon><p>Chưa có reel nào.</p></div> }
    </div>

    <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page() - 1" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>

    @if (formOpen()) {
      <div class="modal" (click)="closeForm()">
        <div class="sheet" (click)="$event.stopPropagation()">
          <div class="sheet-head"><h2>{{ editing() ? 'Sửa reel' : 'Thêm reel' }}</h2><button mat-icon-button (click)="closeForm()"><mat-icon>close</mat-icon></button></div>
          <div class="sheet-body">
            <div class="form-col">
              <label class="fld">Nguồn *
                <select [(ngModel)]="form.source">
                  @for (s of sources; track s) { <option [value]="s">{{ label(s) }}</option> }
                </select>
              </label>
              <label class="fld">Link video (mp4) *<input [(ngModel)]="form.video_url" placeholder="https://…/video.mp4" /></label>
              <label class="fld">Link bài gốc trên MXH<input [(ngModel)]="form.source_url" placeholder="https://instagram.com/p/…" /></label>
              <label class="fld">Ảnh thumbnail (URL)<input [(ngModel)]="form.thumbnail_url" placeholder="https://…" /></label>
              <label class="fld">Caption<textarea rows="2" [(ngModel)]="form.caption"></textarea></label>
              <label class="fld">Hashtags (phân cách dấu phẩy)<input [(ngModel)]="form.hashtags" placeholder="pompom, review, son" /></label>
              <div class="row2">
                <label class="fld">Tên tác giả<input [(ngModel)]="form.author_name" /></label>
                <label class="fld">Handle (@)<input [(ngModel)]="form.author_handle" placeholder="@beautybylinh" /></label>
              </div>
              <label class="fld">Avatar tác giả (URL)<input [(ngModel)]="form.author_avatar" /></label>
              <div class="checks">
                <label class="chk"><input type="checkbox" [(ngModel)]="form.author_verified" /> Tác giả tích xanh</label>
                <label class="chk"><input type="checkbox" [(ngModel)]="form.is_active" /> Hiển thị</label>
              </div>
            </div>
            <div class="preview-col">
              <span class="plabel">Xem trước</span>
              @if (form.video_url) {
                <video class="preview" [src]="form.video_url" controls muted playsinline [poster]="form.thumbnail_url || ''"></video>
              } @else { <div class="preview ph"><mat-icon>movie</mat-icon><span>Nhập link video để xem trước</span></div> }
            </div>
          </div>
          <div class="sheet-actions">
            <button mat-stroked-button (click)="closeForm()">Huỷ</button>
            <button mat-flat-button class="primary" (click)="save()" [disabled]="saving() || !form.video_url.trim()">
              <mat-icon>{{ editing() ? 'save' : 'add' }}</mat-icon> {{ editing() ? 'Lưu' : 'Thêm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
    .page-head h1 { margin: 0; } .sub { margin: 2px 0 0; color: var(--brand-text-secondary); font-size: 13px; }
    .primary { background: var(--brand-pink); color: #fff; }
    .chips { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
    .chip { border: 1px solid var(--mat-sys-outline-variant); background: var(--mat-sys-surface); color: var(--brand-text-secondary); padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; }
    .chip:hover { border-color: var(--brand-pink); color: var(--brand-pink); } .chip.on { background: linear-gradient(135deg, var(--brand-pink), var(--brand-lavender)); color: #fff; border-color: transparent; }
    .toolbar { margin-bottom: 14px; }
    .search { display: flex; align-items: center; gap: 8px; background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 8px 12px; max-width: 360px; }
    .search:focus-within { border-color: var(--brand-pink); box-shadow: 0 0 0 3px var(--brand-pink-light); }
    .search input { border: none; outline: none; background: transparent; width: 100%; font-size: 14px; } .search mat-icon { color: var(--brand-text-secondary); font-size: 20px; } .search .clear { cursor: pointer; }
    .table-wrap { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; overflow: auto; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
    .tbl thead th { text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--brand-text-secondary); padding: 12px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); white-space: nowrap; }
    .tbl tbody td { padding: 10px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); vertical-align: middle; }
    .tbl tbody tr:last-child td { border-bottom: none; } .tbl tbody tr:hover { background: var(--mat-sys-surface-variant); }
    .vid { width: 54px; height: 72px; object-fit: cover; border-radius: 8px; background: #000; }
    .srcbadge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 8px; color: #fff; }
    .srcbadge.instagram { background: #d6297a; } .srcbadge.facebook { background: #2f5bbd; } .srcbadge.tiktok { background: #111; } .srcbadge.youtube { background: #c4302b; }
    .author { font-size: 12px; color: var(--brand-text-secondary); margin-top: 5px; display: flex; align-items: center; gap: 3px; }
    .verified { color: #4db5ff; font-size: 14px; width: 14px; height: 14px; }
    .cap { max-width: 280px; color: var(--brand-text-primary); font-size: 13px; } .num { text-align: right; } .muted { color: var(--brand-text-secondary); white-space: nowrap; }
    .badge { font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 10px; } .badge.on { background: #dcefe4; color: #2f7d52; } .badge.off { background: #eeeeee; color: #777; }
    .actions { text-align: right; white-space: nowrap; }
    .empty { text-align: center; padding: 48px; color: var(--brand-text-secondary); } .empty mat-icon { font-size: 42px; width: 42px; height: 42px; opacity: .4; }

    .modal { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
    .sheet { background: var(--mat-sys-surface); border-radius: 18px; width: 100%; max-width: 760px; max-height: 92vh; overflow: auto; }
    .sheet-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .sheet-head h2 { margin: 0; font-size: 18px; }
    .sheet-body { display: grid; grid-template-columns: 1fr 240px; gap: 18px; padding: 18px 20px; }
    @media (max-width: 720px) { .sheet-body { grid-template-columns: 1fr; } }
    .fld { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 600; color: var(--brand-text-secondary); margin-bottom: 12px; }
    .fld input, .fld select, .fld textarea { border: 1px solid var(--mat-sys-outline-variant); border-radius: 9px; padding: 9px 11px; font-size: 14px; font-family: inherit; color: var(--brand-text-primary); }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .checks { display: flex; gap: 18px; } .chk { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--brand-text-secondary); } .chk input { width: 16px; height: 16px; accent-color: var(--brand-pink); }
    .preview-col { display: flex; flex-direction: column; gap: 8px; } .plabel { font-size: 12px; font-weight: 700; color: var(--brand-text-secondary); text-transform: uppercase; }
    .preview { width: 100%; aspect-ratio: 9/16; border-radius: 12px; background: #000; object-fit: cover; } .preview.ph { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #bbb; background: var(--brand-background); border: 1px dashed var(--mat-sys-outline-variant); font-size: 12px; }
    .sheet-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px; }
  `]
})
export class ReelList implements OnInit {
  private service = inject(AdminFeedService);
  private snack = inject(MatSnackBar);

  reels = signal<Reel[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  saving = signal(false);
  limit = 20;
  source = '';
  search = '';
  sources = ['instagram', 'facebook', 'tiktok', 'youtube'];

  formOpen = signal(false);
  editing = signal<string | null>(null);
  form: ReelPayload = this.blank();

  ngOnInit(): void { this.load(); }
  private blank(): ReelPayload {
    return { source: 'instagram', source_url: '', video_url: '', thumbnail_url: '', caption: '', hashtags: '', author_name: '', author_handle: '', author_avatar: '', author_verified: false, is_active: true };
  }
  load(): void {
    this.loading.set(true);
    this.service.listReels({ page: this.page(), limit: this.limit, source: this.source, search: this.search }).subscribe({
      next: (res) => { this.reels.set(res.data); this.total.set(res.total); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
  applyFilter(): void { this.page.set(1); this.load(); }
  setSource(s: string): void { this.source = s; this.applyFilter(); }
  onPage(e: PageEvent): void { this.limit = e.pageSize; this.page.set(e.pageIndex + 1); this.load(); }

  openCreate(): void { this.editing.set(null); this.form = this.blank(); this.formOpen.set(true); }
  openEdit(r: Reel): void {
    this.editing.set(r._id);
    this.form = {
      source: r.source, source_url: r.source_url || '', video_url: r.video_url, thumbnail_url: r.thumbnail_url || '',
      caption: r.caption || '', hashtags: (r.hashtags || []).join(', '),
      author_name: r.author?.name || '', author_handle: r.author?.handle || '', author_avatar: r.author?.avatar_url || '',
      author_verified: !!r.author?.verified, is_active: r.is_active !== false
    };
    this.formOpen.set(true);
  }
  closeForm(): void { this.formOpen.set(false); }

  save(): void {
    if (!this.form.video_url.trim()) return;
    this.saving.set(true);
    const id = this.editing();
    const op = id ? this.service.updateReel(id, this.form) : this.service.createReel(this.form);
    op.subscribe({
      next: () => { this.saving.set(false); this.formOpen.set(false); this.snack.open(id ? 'Đã cập nhật reel' : 'Đã thêm reel', 'OK', { duration: 2500 }); this.load(); },
      error: (err) => { this.saving.set(false); this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 }); }
    });
  }
  remove(r: Reel): void {
    if (!confirm('Xoá reel này?')) return;
    this.service.deleteReel(r._id).subscribe(() => { this.snack.open('Đã xoá reel', 'OK', { duration: 2000 }); this.load(); });
  }

  play(e: Event): void { const v = e.target as HTMLVideoElement; v.play().catch(() => {}); }
  stop(e: Event): void { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }
  label(s: string): string { return SRC_LABEL[s] ?? s; }
  kfmt(n?: number): string { n = n || 0; return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n); }
}
