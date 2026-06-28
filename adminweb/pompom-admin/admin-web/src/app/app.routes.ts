import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login)
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports').then((m) => m.Reports)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/product-list/product-list').then((m) => m.ProductList)
      },
      {
        path: 'products/new',
        loadComponent: () => import('./features/products/product-form/product-form').then((m) => m.ProductForm)
      },
      {
        path: 'products/:id/edit',
        loadComponent: () => import('./features/products/product-form/product-form').then((m) => m.ProductForm)
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/order-list/order-list').then((m) => m.OrderList)
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./features/orders/order-detail/order-detail').then((m) => m.OrderDetail)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/user-list/user-list').then((m) => m.UserList)
      },
      {
        path: 'users/:id',
        loadComponent: () => import('./features/users/user-detail/user-detail').then((m) => m.UserDetail)
      },
      {
        path: 'moderation',
        loadComponent: () => import('./features/community/moderation/moderation').then((m) => m.Moderation)
      },
      {
        path: 'content/banners',
        loadComponent: () => import('./features/content/banners/banner-list').then((m) => m.BannerList)
      },
      {
        path: 'content/collections',
        loadComponent: () => import('./features/content/collections/collections').then((m) => m.Collections)
      },
      {
        path: 'content/quick-links',
        loadComponent: () => import('./features/content/quick-links/quick-links').then((m) => m.QuickLinks)
      },
      {
        path: 'content/sections',
        loadComponent: () => import('./features/content/sections/sections').then((m) => m.Sections)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings)
      },
      {
        path: 'community',
        loadComponent: () => import('./features/community/post-list/post-list').then((m) => m.PostList)
      },
      {
        path: 'community/:id',
        loadComponent: () => import('./features/community/post-detail/post-detail').then((m) => m.PostDetail)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
