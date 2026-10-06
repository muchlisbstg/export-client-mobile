# Platform Klien Ekspor — Mobile

Aplikasi Expo/React Native yang memakai API bersama dengan [aplikasi web](https://github.com/muchlisbstg/export-client-web). API dan kontraknya dikelola di repo web.

## Jalankan lokal

Gunakan Node.js 22 atau lebih baru.

```bash
npm ci
cp .env.example .env
```

Atur `EXPO_PUBLIC_API_URL` di `.env` sesuai perangkat:

- Android Emulator: `http://10.0.2.2:4000`
- iOS Simulator: `http://127.0.0.1:4000`
- Perangkat fisik: alamat IP LAN komputer yang menjalankan server, misalnya `http://192.168.1.10:4000`

Jalankan server dari repo web terlebih dahulu (`npm run dev:api`), lalu mulai Expo:

```bash
npm start
```

Komputer dan perangkat fisik harus berada di jaringan yang saling terjangkau; firewall perlu mengizinkan port API. `EXPO_PUBLIC_*` tertanam pada bundle aplikasi, jadi hanya boleh berisi konfigurasi publik seperti alamat API—jangan pernah menaruh token atau rahasia di sana.

## Sinkronisasi

Katalog, pengiriman RFQ, dan status pelacakan menggunakan API dan database yang sama dengan aplikasi web. Buat permintaan dari salah satu klien, simpan kode pelacakan, lalu masukkan kode itu di klien lainnya untuk membaca statusnya. Kontrak endpoint: [OpenAPI di repo web](https://github.com/muchlisbstg/export-client-web/blob/main/docs/openapi.yaml).

Katalog saat ini berisi data demo. Cakupan produk mengecualikan pertambangan/ekstraksi, alkohol dan wine, serta produk babi atau turunannya. MVP belum memiliki login atau alur transaksi; jangan gunakan untuk menyimpan data klien nyata sebelum kontrol akses, perlindungan data, TLS, dan kebijakan retensi siap.

## Catatan audit dependensi

Pada 6 Oktober 2026, `npm audit` masih melaporkan 15 temuan high pada rantai build Expo/Metro, termasuk advisori [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) dan [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv); belum ada rilis upstream yang menutup keduanya. Advisory UUID terselesaikan dengan override `uuid` `^11.1.1`. `npm audit fix --force` menyarankan downgrade Expo SDK 57 ke SDK 44, yang tidak diterapkan karena merusak kompatibilitas SDK. Jalankan ulang audit saat SDK diperbarui dan terapkan versi patch upstream segera setelah tersedia.
