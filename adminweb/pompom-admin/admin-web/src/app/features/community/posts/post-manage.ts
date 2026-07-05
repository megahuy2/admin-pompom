import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  AdminFeedService, Blog, BlogPayload, ExpertArticle, ExpertArticlePayload, Expert, ExpertPayload
} from '../../../core/services/admin-feed.service';

type Tab = 'blog' | 'article' | 'expert';

@Component({
  selector: 'app-post-manage',
  imports: [FormsModule, DatePipe, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  template: `
    <div class="page-head">
      <div><h1>Bài viết</h1><p class="sub">Blog thương hiệu, bài tips bác sĩ & hồ sơ chuyên gia</p></div>
      <button mat-flat-button class="primary" (click)="add()"><mat-icon>add</mat-icon> {{ addLabel() }}</button>
    </div>

    <div class="tabs">
      <button class="tab" [class.on]="tab() === 'blog'" (click)="switch('blog')"><mat-icon>article</mat-icon> Blog thương hiệu</button>
      <button class="tab" [class.on]="tab() === 'article'" (click)="switch('article')"><mat-icon>medical_services</mat-icon> Tips bác sĩ</button>
      <button class="tab" [class.on]="tab() === 'expert'" (click)="switch('expert')"><mat-icon>badge</mat-icon> Bác sĩ / chuyên gia</button>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    <!-- ===== BLOG ===== -->
    @if (tab() === 'blog') {
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>Bài viết</th><th>Danh mục</th><th>Tác giả</th><th>Trạng thái</th><th class="num">Lượt xem</th><th>Đăng</th><th></th></tr></thead>
          <tbody>
            @for (b of blogs(); track b._id) {
              <tr>
                <td class="title-cell">
                  @if (b.cover_image) { <img class="cover" [src]="b.cover_image" alt="" /> } @else { <div class="cover ph"><mat-icon>article</mat-icon></div> }
                  <div><b>{{ b.title }}</b><div class="ex">{{ b.excerpt }}</div></div>
                </td>
                <td><span class="tag">{{ b.category || '—' }}</span></td>
                <td class="muted">{{ b.author?.name || 'PomPom' }}</td>
                <td><span class="badge" [class.on]="b.is_published" [class.off]="!b.is_published">{{ b.is_published ? 'Đã đăng' : 'Nháp' }}</span></td>
                <td class="num muted">{{ b.view_count || 0 }}</td>
                <td class="muted">{{ b.published_at | date:'dd/MM/yy' }}</td>
                <td class="act"><button mat-icon-button (click)="editBlog(b)" matTooltip="Sửa"><mat-icon>edit</mat-icon></button><button mat-icon-button (click)="del('blog', b._id, b.title)" matTooltip="Xoá"><mat-icon>delete</mat-icon></button></td>
              </tr>
            }
          </tbody>
        </table>
        @if (!loading() && blogs().length === 0) { <div class="empty"><mat-icon>article</mat-icon><p>Chưa có blog.</p></div> }
      </div>
    }

    <!-- ===== EXPERT ARTICLES ===== -->
    @if (tab() === 'article') {
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>Bài viết</th><th>Bác sĩ</th><th>Danh mục</th><th>Trạng thái</th><th class="num">Lượt xem</th><th></th></tr></thead>
          <tbody>
            @for (a of articles(); track a._id) {
              <tr>
                <td class="title-cell">
                  @if (a.cover_image) { <img class="cover" [src]="a.cover_image" alt="" /> } @else { <div class="cover ph"><mat-icon>medical_services</mat-icon></div> }
                  <div><b>{{ a.title }}</b><div class="ex">{{ a.excerpt }}</div></div>
                </td>
                <td class="muted">{{ expertName(a) }}</td>
                <td><span class="tag">{{ a.category || '—' }}</span></td>
                <td><span class="badge" [class.on]="a.is_published" [class.off]="!a.is_published">{{ a.is_published ? 'Đã đăng' : 'Nháp' }}</span></td>
                <td class="num muted">{{ a.view_count || 0 }}</td>
                <td class="act"><button mat-icon-button (click)="editArticle(a)" matTooltip="Sửa"><mat-icon>edit</mat-icon></button><button mat-icon-button (click)="del('article', a._id, a.title)" matTooltip="Xoá"><mat-icon>delete</mat-icon></button></td>
              </tr>
            }
          </tbody>
        </table>
        @if (!loading() && articles().length === 0) { <div class="empty"><mat-icon>medical_services</mat-icon><p>Chưa có bài tips.</p></div> }
      </div>
    }

    <!-- ===== EXPERTS ===== -->
    @if (tab() === 'expert') {
      <div class="exp-grid">
        @for (e of experts(); track e._id) {
          <div class="expcard">
            @if (e.avatar_url) { <img class="eav" [src]="e.avatar_url" alt="" /> } @else { <div class="eav ph"><mat-icon>person</mat-icon></div> }
            <div class="einfo">
              <b>{{ e.name }}</b>
              <span class="etitle">{{ e.title }}</span>
              <span class="espec">{{ e.specialty }}</span>
              @if (e.contact?.phone) { <span class="ephone"><mat-icon>call</mat-icon> {{ e.contact?.phone }}</span> }
              <span class="badge" [class.on]="e.is_available" [class.off]="!e.is_available">{{ e.is_available ? 'Đang nhận tư vấn' : 'Tạm nghỉ' }}</span>
            </div>
            <div class="eact"><button mat-icon-button (click)="editExpert(e)"><mat-icon>edit</mat-icon></button><button mat-icon-button (click)="del('expert', e._id, e.name)"><mat-icon>delete</mat-icon></button></div>
          </div>
        }
        @if (!loading() && experts().length === 0) { <div class="empty"><mat-icon>badge</mat-icon><p>Chưa có chuyên gia.</p></div> }
      </div>
    }

    <!-- ===== MODAL ===== -->
    @if (modal()) {
      <div class="ov" (click)="modal.set(null)">
        <div class="sheet" (click)="$event.stopPropagation()">
          <div class="sheet-head"><h2>{{ modalTitle() }}</h2><button mat-icon-button (click)="modal.set(null)"><mat-icon>close</mat-icon></button></div>
          <div class="sheet-body">
            @if (modal() === 'blog') {
              <label class="fld span2">Tiêu đề *<input [(ngModel)]="bf.title" /></label>
              <label class="fld">Danh mục<input [(ngModel)]="bf.category" placeholder="Thương hiệu, Bí quyết…" /></label>
              <label class="fld">Phút đọc<input type="number" [(ngModel)]="bf.read_time" /></label>
              <label class="fld span2">Ảnh bìa (URL)<input [(ngModel)]="bf.cover_image" /></label>
              <label class="fld span2">Tóm tắt<textarea rows="2" [(ngModel)]="bf.excerpt"></textarea></label>
              <label class="fld span2">Nội dung<textarea rows="4" [(ngModel)]="bf.content"></textarea></label>
              <label class="fld">Tác giả<input [(ngModel)]="bf.author_name" /></label>
              <label class="fld">Vai trò<input [(ngModel)]="bf.author_role" placeholder="Thương hiệu" /></label>
              <label class="fld chk span2"><input type="checkbox" [(ngModel)]="bf.is_published" /> Đăng công khai</label>
            }
            @if (modal() === 'article') {
              <label class="fld span2">Bác sĩ / chuyên gia *
                <select [(ngModel)]="af.expert_id">
                  <option value="">— Chọn —</option>
                  @for (e of experts(); track e._id) { <option [value]="e._id">{{ e.name }} @if (e.title) { ({{ e.title }}) }</option> }
                </select>
              </label>
              <label class="fld span2">Tiêu đề *<input [(ngModel)]="af.title" /></label>
              <label class="fld">Danh mục<input [(ngModel)]="af.category" placeholder="Chăm sóc da…" /></label>
              <label class="fld">Phút đọc<input type="number" [(ngModel)]="af.read_time" /></label>
              <label class="fld span2">Ảnh bìa (URL)<input [(ngModel)]="af.cover_image" /></label>
              <label class="fld span2">Tóm tắt<textarea rows="2" [(ngModel)]="af.excerpt"></textarea></label>
              <label class="fld span2">Nội dung<textarea rows="4" [(ngModel)]="af.content"></textarea></label>
              <label class="fld chk span2"><input type="checkbox" [(ngModel)]="af.is_published" /> Đăng công khai</label>
            }
            @if (modal() === 'expert') {
              <label class="fld">Họ tên *<input [(ngModel)]="ef.name" /></label>
              <label class="fld">Chức danh<input [(ngModel)]="ef.title" placeholder="Bác sĩ Da liễu" /></label>
              <label class="fld span2">Chuyên môn<input [(ngModel)]="ef.specialty" /></label>
              <label class="fld span2">Ảnh đại diện (URL)<input [(ngModel)]="ef.avatar_url" /></label>
              <label class="fld span2">Học hàm / nơi công tác<input [(ngModel)]="ef.credentials" /></label>
              <label class="fld span2">Giới thiệu<textarea rows="2" [(ngModel)]="ef.bio"></textarea></label>
              <label class="fld">Số điện thoại<input [(ngModel)]="ef.phone" /></label>
              <label class="fld">Zalo<input [(ngModel)]="ef.zalo" /></label>
              <label class="fld chk span2"><input type="checkbox" [(ngModel)]="ef.is_available" /> Đang nhận tư vấn</label>
            }
          </div>
          <div class="sheet-actions">
            <button mat-stroked-button (click)="modal.set(null)">Huỷ</button>
            <button mat-flat-button class="primary" (click)="save()" [disabled]="saving()"><mat-icon>save</mat-icon> Lưu</button>
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
    .tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .tab { display: flex; align-items: center; gap: 6px; border: 1px solid var(--mat-sys-outline-variant); background: var(--mat-sys-surface); color: var(--brand-text-secondary); padding: 8px 16px; border-radius: 999px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .15s; }
    .tab mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .tab:hover { border-color: var(--brand-pink); color: var(--brand-pink); } .tab.on { background: linear-gradient(135deg, var(--brand-pink), var(--brand-lavender)); color: #fff; border-color: transparent; }
    .table-wrap { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; overflow: auto; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
    .tbl thead th { text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--brand-text-secondary); padding: 12px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); white-space: nowrap; }
    .tbl tbody td { padding: 10px 14px; border-bottom: 1px solid var(--mat-sys-outline-variant); vertical-align: middle; }
    .tbl tbody tr:last-child td { border-bottom: none; } .tbl tbody tr:hover { background: var(--mat-sys-surface-variant); }
    .title-cell { display: flex; align-items: center; gap: 12px; min-width: 280px; }
    .cover { width: 56px; height: 42px; border-radius: 8px; object-fit: cover; flex: 0 0 auto; }
    .cover.ph { display: flex; align-items: center; justify-content: center; background: var(--brand-pink-light); color: var(--brand-pink); }
    .title-cell b { display: block; color: var(--brand-text-primary); } .ex { font-size: 12px; color: var(--brand-text-secondary); max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tag { font-size: 12px; font-weight: 600; background: var(--brand-lavender-light); color: #7a4f63; padding: 3px 10px; border-radius: 8px; }
    .muted { color: var(--brand-text-secondary); } .num { text-align: right; } .act { text-align: right; white-space: nowrap; }
    .badge { font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 10px; } .badge.on { background: #dcefe4; color: #2f7d52; } .badge.off { background: #eeeeee; color: #777; }

    .exp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .expcard { background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); border-radius: 14px; padding: 16px; display: flex; gap: 12px; position: relative; }
    .eav { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; flex: 0 0 auto; border: 3px solid var(--brand-pink-light); }
    .eav.ph { display: flex; align-items: center; justify-content: center; background: var(--brand-pink-light); color: var(--brand-pink); }
    .einfo { display: flex; flex-direction: column; gap: 2px; } .einfo b { font-size: 15px; } .etitle { font-size: 12px; color: var(--brand-pink); font-weight: 600; } .espec { font-size: 12px; color: var(--brand-text-secondary); }
    .ephone { font-size: 12px; color: var(--brand-text-secondary); display: flex; align-items: center; gap: 4px; margin-top: 4px; } .ephone mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .einfo .badge { align-self: flex-start; margin-top: 6px; }
    .eact { position: absolute; top: 8px; right: 8px; }

    .empty { text-align: center; padding: 48px; color: var(--brand-text-secondary); } .empty mat-icon { font-size: 42px; width: 42px; height: 42px; opacity: .4; }
    .ov { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
    .sheet { background: var(--mat-sys-surface); border-radius: 18px; width: 100%; max-width: 620px; max-height: 92vh; overflow: auto; }
    .sheet-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--mat-sys-outline-variant); } .sheet-head h2 { margin: 0; font-size: 18px; }
    .sheet-body { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 18px 20px; }
    .fld { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 600; color: var(--brand-text-secondary); } .fld.span2 { grid-column: 1 / -1; }
    .fld input, .fld select, .fld textarea { border: 1px solid var(--mat-sys-outline-variant); border-radius: 9px; padding: 9px 11px; font-size: 14px; font-family: inherit; color: var(--brand-text-primary); }
    .fld.chk { flex-direction: row; align-items: center; gap: 8px; } .fld.chk input { width: 16px; height: 16px; accent-color: var(--brand-pink); }
    .sheet-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px; }
  `]
})
export class PostManage implements OnInit {
  private service = inject(AdminFeedService);
  private snack = inject(MatSnackBar);

  tab = signal<Tab>('blog');
  loading = signal(false);
  saving = signal(false);

  blogs = signal<Blog[]>([]);
  articles = signal<ExpertArticle[]>([]);
  experts = signal<Expert[]>([]);

  modal = signal<Tab | null>(null);
  editId = signal<string | null>(null);
  bf: BlogPayload = this.blankBlog();
  af: ExpertArticlePayload = this.blankArticle();
  ef: ExpertPayload = this.blankExpert();

  ngOnInit(): void {
    this.service.listExperts().subscribe((r) => this.experts.set(r.data)); // cần cho tab bác sĩ + select bài tips
    this.load();
  }

  switch(t: Tab): void { this.tab.set(t); this.load(); }
  load(): void {
    this.loading.set(true);
    if (this.tab() === 'blog') {
      this.service.listBlogs({ limit: 50 }).subscribe({ next: (r) => { this.blogs.set(r.data); this.loading.set(false); }, error: () => this.loading.set(false) });
    } else if (this.tab() === 'article') {
      this.service.listExpertArticles({ limit: 50 }).subscribe({ next: (r) => { this.articles.set(r.data); this.loading.set(false); }, error: () => this.loading.set(false) });
    } else {
      this.service.listExperts().subscribe({ next: (r) => { this.experts.set(r.data); this.loading.set(false); }, error: () => this.loading.set(false) });
    }
  }

  addLabel(): string { return { blog: 'Thêm blog', article: 'Thêm bài tips', expert: 'Thêm bác sĩ' }[this.tab()]; }
  modalTitle(): string {
    const isEdit = !!this.editId();
    return ({ blog: isEdit ? 'Sửa blog' : 'Thêm blog', article: isEdit ? 'Sửa bài tips' : 'Thêm bài tips', expert: isEdit ? 'Sửa chuyên gia' : 'Thêm chuyên gia' })[this.modal() as Tab];
  }

  add(): void {
    this.editId.set(null);
    if (this.tab() === 'blog') this.bf = this.blankBlog();
    else if (this.tab() === 'article') this.af = this.blankArticle();
    else this.ef = this.blankExpert();
    this.modal.set(this.tab());
  }
  editBlog(b: Blog): void {
    this.editId.set(b._id);
    this.bf = { title: b.title, cover_image: b.cover_image || '', excerpt: b.excerpt || '', content: b.content || '', category: b.category || '', read_time: b.read_time || 3, author_name: b.author?.name || 'PomPom Team', author_role: b.author?.role || 'Thương hiệu', is_published: b.is_published !== false };
    this.modal.set('blog');
  }
  editArticle(a: ExpertArticle): void {
    this.editId.set(a._id);
    const eid = typeof a.expert_id === 'object' && a.expert_id ? a.expert_id._id : (a.expert_id as string) || '';
    this.af = { expert_id: eid, title: a.title, cover_image: a.cover_image || '', excerpt: a.excerpt || '', content: a.content || '', category: a.category || '', read_time: a.read_time || 4, is_published: a.is_published !== false };
    this.modal.set('article');
  }
  editExpert(e: Expert): void {
    this.editId.set(e._id);
    this.ef = { name: e.name, title: e.title || '', specialty: e.specialty || '', avatar_url: e.avatar_url || '', credentials: e.credentials || '', bio: e.bio || '', phone: e.contact?.phone || '', zalo: e.contact?.zalo || '', is_available: e.is_available !== false };
    this.modal.set('expert');
  }

  save(): void {
    const id = this.editId();
    const done = (msg: string) => { this.saving.set(false); this.modal.set(null); this.snack.open(msg, 'OK', { duration: 2500 }); this.load(); };
    const fail = (err: unknown) => { this.saving.set(false); this.snack.open((err as { error?: { message?: string } })?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000 }); };
    this.saving.set(true);
    if (this.modal() === 'blog') {
      if (!this.bf.title.trim()) { this.saving.set(false); return; }
      (id ? this.service.updateBlog(id, this.bf) : this.service.createBlog(this.bf)).subscribe({ next: () => done(id ? 'Đã cập nhật blog' : 'Đã thêm blog'), error: fail });
    } else if (this.modal() === 'article') {
      if (!this.af.title.trim() || !this.af.expert_id) { this.saving.set(false); this.snack.open('Chọn bác sĩ và nhập tiêu đề', 'Đóng', { duration: 3000 }); return; }
      (id ? this.service.updateExpertArticle(id, this.af) : this.service.createExpertArticle(this.af)).subscribe({ next: () => done(id ? 'Đã cập nhật' : 'Đã thêm bài tips'), error: fail });
    } else {
      if (!this.ef.name.trim()) { this.saving.set(false); return; }
      (id ? this.service.updateExpert(id, this.ef) : this.service.createExpert(this.ef)).subscribe({ next: () => done(id ? 'Đã cập nhật' : 'Đã thêm chuyên gia'), error: fail });
    }
  }

  del(type: Tab, id: string, name: string): void {
    if (!confirm(`Xoá "${name}"?`)) return;
    const op = type === 'blog' ? this.service.deleteBlog(id) : type === 'article' ? this.service.deleteExpertArticle(id) : this.service.deleteExpert(id);
    op.subscribe({ next: (r) => { this.snack.open(r.message, 'OK', { duration: 2000 }); this.load(); }, error: (e) => this.snack.open(e?.error?.message ?? 'Không thể xoá', 'Đóng', { duration: 3500 }) });
  }

  expertName(a: ExpertArticle): string { return typeof a.expert_id === 'object' && a.expert_id ? a.expert_id.name : '—'; }

  private blankBlog(): BlogPayload { return { title: '', cover_image: '', excerpt: '', content: '', category: '', read_time: 3, author_name: 'PomPom Team', author_role: 'Thương hiệu', is_published: true }; }
  private blankArticle(): ExpertArticlePayload { return { expert_id: '', title: '', cover_image: '', excerpt: '', content: '', category: '', read_time: 4, is_published: true }; }
  private blankExpert(): ExpertPayload { return { name: '', title: '', specialty: '', avatar_url: '', credentials: '', bio: '', phone: '', zalo: '', is_available: true }; }
}
