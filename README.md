# Platform Klien Ekspor — Mobile

Aplikasi Expo/React Native ini memakai **backend mandiri di repo ini** secara default. Backend adalah peer append-only: setiap node menyimpan dan meneruskan inquiry baru, tanpa master. Inquiry tidak dapat diedit atau dihapus.

## Jalankan API lokal

Gunakan Node.js 22 atau lebih baru.

```bash
npm ci
cp .env.api.example .env.api
npm run dev:api
```

API mendengarkan `0.0.0.0:4001` (ubah `API_PORT` bila perlu) dan membuat SQLite lokal di `server/data/api.sqlite`. Katalog berisi produk demo. Jangan memasukkan data klien nyata. File `.env.api` hanya untuk server dan tidak dibundle ke Expo.

Endpoint standar:

- `GET /health`
- `GET /api/v1/products`
- `POST /api/v1/inquiries`
- `GET /api/v1/inquiries/:trackingCode`

## Jalankan Expo

Salin konfigurasi publik hanya bila ingin mengganti default:

```bash
cp .env.example .env
npm start
```

Default aplikasi adalah `http://10.0.2.2:4001` pada Android Emulator dan `http://127.0.0.1:4001` pada iOS Simulator. Untuk perangkat fisik, set `EXPO_PUBLIC_API_URL` ke IP LAN komputer, misalnya `http://192.168.1.10:4001`. `EXPO_PUBLIC_*` tertanam di bundle aplikasi; alamat API boleh publik, tetapi **jangan pernah menaruh token atau secret di sana**.

Komputer dan perangkat harus saling menjangkau. Buka firewall hanya untuk port API yang diperlukan dan jaringan tepercaya. Untuk jaringan non-local, gunakan reverse proxy/TLS (`https://`) dan jangan mengirim secret melalui HTTP biasa.

## Peer sync (opsional)

Sync nonaktif jika `SYNC_SHARED_SECRET` kosong. Untuk mengaktifkannya, di setiap node gunakan `SYNC_NODE_ID` unik, secret bersama, dan daftar peer:

```dotenv
SYNC_NODE_ID=mobile-local
SYNC_SHARED_SECRET=<secret-random-minimal-32-karakter-yang-sama-pada-ketiga-backend>
SYNC_PEERS=web-local=https://web.example:4000,desktop-local=https://desktop.example:4002
```

`SYNC_PEERS` harus berupa `nodeId=http(s)://host:port`; URL dengan username/password, query, atau fragment ditolak. Gunakan `openssl rand -hex 32` untuk membuat secret; jangan menaruhnya di Expo config. Endpoint internal `POST /api/v1/sync/inquiries` memerlukan `Authorization: Bearer ...`. Outbox dan conflict log persisten di SQLite, dengan retry/backoff dan timeout. Node tidak mengirim kembali ke origin atau dirinya sendiri; penerimaan ulang yang identik idempotent, sedangkan ID/tracking code yang sama dengan isi berbeda dicatat sebagai konflik tanpa overwrite dan mengembalikan HTTP 409.

## Pengujian dan pemeriksaan

```bash
npm test
npm run typecheck
npx expo export --platform android
```

Tes backend memakai database sementara dan mencakup health, katalog, create/track, sync disabled, autentikasi, replikasi idempotent, serta conflict non-overwrite. Tes API client tetap dijalankan dalam suite yang sama. Perintah export Android adalah compatibility check dan tidak melakukan deployment.

Tidak ada login/admin, edit status, retensi, penghapusan, deployment, atau koneksi ke data klien nyata dalam MVP ini.
