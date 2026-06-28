import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <div class="login-wrapper">
      <mat-card class="login-card">
        @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
        <div class="login-logo">
          <img src="logo.png" alt="PomPom" />
        </div>
        <mat-card-header>
          <mat-card-title>PomPom Admin</mat-card-title>
          <mat-card-subtitle>Đăng nhập quản trị</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="field">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="username" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="field">
              <mat-label>Mật khẩu</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="current-password" />
            </mat-form-field>
            @if (error()) { <p class="error">{{ error() }}</p> }
            <button mat-flat-button color="primary" class="submit" type="submit" [disabled]="form.invalid || loading()">
              Đăng nhập
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex; justify-content: center; align-items: center; min-height: 100vh;
      background: linear-gradient(135deg, var(--brand-background) 0%, var(--brand-lavender-light) 100%);
    }
    .login-card {
      width: 360px; padding-bottom: 16px;
      border-top: 4px solid var(--brand-pink);
    }
    .login-logo { display: flex; justify-content: center; padding: 24px 0 8px; }
    .login-logo img { height: 64px; width: auto; object-fit: contain; }
    .field { width: 100%; }
    .submit { width: 100%; margin-top: 8px; }
    .error { color: var(--mat-sys-error); font-size: 13px; margin: 4px 0; }
  `]
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Đăng nhập thất bại');
      }
    });
  }
}
