# CMS CRUD PWA

Project ini adalah CMS sederhana dengan fitur CRUD, backend Express, database PostgreSQL siap Railway, serta dukungan PWA dan notifikasi push.

## Fitur
- CRUD artikel melalui API
- Frontend interaktif dengan Async JavaScript
- PWA dengan service worker
- Notifikasi push sederhana
- Siap di-deploy ke Railway

## Jalankan Lokal
```bash
npm install
npm start
```

## Environment
Buat file .env dengan:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```
Jika DATABASE_URL tidak ada, server akan memakai penyimpanan file lokal.

## Deploy ke Railway
1. Hubungkan repository ke Railway.
2. Set environment variable DATABASE_URL.
3. Deploy.
