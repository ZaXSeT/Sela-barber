# Sela Barber — reservasi kursi barber

Demo portofolio untuk pemilik barbershop satu kursi. Pengunjung melihat papan harga, memilih jam WIB yang masih kosong, dan mendapat kartu janji. Pengunjung berikutnya langsung melihat jam itu tertutup.

Semua nama, alamat, dan data pelanggan di proyek ini fiktif.

**Status:** selesai dan teruji lokal (24 Nov 2026). Belum di-deploy. Langkah deploy ada di bagian [Deploy ke Vercel](#deploy-ke-vercel).

![Kartu janji di HP, lebar 390 px](docs/hp-kartu-janji.png)

## Stack

- SvelteKit 3 (Svelte 5, TypeScript) dengan form action, `@sveltejs/adapter-vercel`, dan runtime Node.js 22 (region `sin1`).
- Supabase Postgres sebagai backend, diakses dari fungsi server lewat driver `postgres` (postgres.js). Tidak ada akses database dari browser.
- Postgres lokal tertanam (`embedded-postgres`) untuk dev dan tes, tanpa Docker dan tanpa instalasi tambahan.

## Prasyarat

- Node.js 22 atau lebih baru (diuji dengan Node 24.11).
- npm 10 atau lebih baru.

## Menjalankan lokal

```powershell
npm install
copy .env.example .env      # lalu isi DATABASE_URL dengan URL lokal di bawah
npm run db:start            # terminal 1: Postgres lokal di port 55401, biarkan berjalan
npm run db:setup            # terminal 2: migrasi + seed katalog
npm run dev                 # http://localhost:5173
```

URL lokal untuk `.env`:

```
DATABASE_URL=postgres://postgres:postgres-lokal@127.0.0.1:55401/sela_barber
```

Data lokal tersimpan di `.data/pg` (tidak masuk git). Seed boleh diulang. Seed hanya memperbarui tiga layanan dengan ID tetap dan tidak menyentuh reservasi.

| Perintah | Fungsi |
|---|---|
| `npm run db:start` | Menyalakan Postgres lokal sekaligus membuat database `sela_barber` dan `sela_barber_test` |
| `npm run db:migrate` | Menerapkan `db/migrations/*.sql` ke `DATABASE_URL` (aman diulang) |
| `npm run db:seed` | Mengisi katalog layanan (aman diulang) |
| `npm run dev` | Dev server |
| `npm run check` | Pemeriksaan tipe (`svelte-check`) |
| `npm run lint` | ESLint |
| `npm test` | Tes aturan bisnis B1–B4 terhadap database tes terpisah |
| `npm run build` | Build produksi untuk Vercel |
| `npm run build:local` lalu `npm run start:local` | Pratinjau produksi lokal di http://localhost:4171 (adapter Node, CSRF aktif) |
| `npm run agenda` | Akses pemilik (lihat di bawah) |
| `npm run images` | Memproses ulang foto sumber `assets-src/raw` ke `static/foto` |

> **Catatan Windows:** di tahap akhir, `npm run build` membuat symlink untuk Vercel Build Output. Windows menolak symlink kecuali Developer Mode aktif (`EPERM: symlink`). Kompilasi aplikasinya sendiri lulus. Build di Vercel (Linux) tidak terkena masalah ini. Untuk menguji hasil build di Windows, pakai `npm run build:local`.

## Akses pemilik

Agenda dibaca langsung dari database. Kontak pelanggan hanya muncul di sini, tidak pernah di halaman publik.

```powershell
npm run agenda                          # hari ini (WIB)
npm run agenda -- --besok
npm run agenda -- --tanggal 2026-11-25
```

Contoh keluaran dengan data fiktif:

```
Agenda Sela Barber · Rabu, 25 November 2026
──────────────────────────────────────────────────────────────────────────────
Jam    Kode       Layanan           Harga     Nama          WhatsApp
14.30  SB-LLQJ5Z  Potong Rapi       Rp55.000  Raka          +6281200000101
16.00  SB-NNFG56  Potong + Keramas  Rp70.000  Dimas         +6281200000202
16.45  SB-795PVV  Potong + Keramas  Rp70.000  Raka          +6281200000101
──────────────────────────────────────────────────────────────────────────────
3 dari 12 slot terisi · perkiraan pendapatan Rp195.000
```

Untuk database Production, jalankan perintah ini dengan `DATABASE_URL` Production di environment terminal. Jangan simpan URL itu di repo.

## Aturan bisnis

- Satu kursi. Buka Selasa–Minggu 10.00–19.00 WIB, Senin tutup.
- Slot mulai tiap 45 menit, dari 10.00 sampai 18.15 (12 slot). Satu reservasi memakai satu slot penuh.
- Tanggal yang bisa dipilih: hari ini sampai 30 hari ke depan menurut Asia/Jakarta.
- Waktu mulai disimpan sebagai `timestamptz` UTC dan ditampilkan dalam WIB.
- Keunikan slot dijaga oleh constraint `unique (chair_id, starts_at)` di database. Insert memakai `on conflict do nothing`, jadi dari dua permintaan yang bersamaan tepat satu yang menang. Pihak yang kalah mendapat tiga jam alternatif terdekat, dan nama serta nomornya tetap terisi.
- Harga dan nama layanan disalin ke reservasi saat dipesan. Harga dari browser diabaikan.

## Keamanan dan privasi

- Semua input divalidasi di server dengan zod: ID layanan, format tanggal/jam, rentang, hari tutup, kisi 45 menit, waktu lampau, nama (2–40 huruf), dan nomor WhatsApp Indonesia.
- Query SQL selalu berparameter (tagged template postgres.js).
- Origin form diperiksa oleh proteksi CSRF bawaan SvelteKit di produksi. Ini sudah diuji: POST lintas origin mendapat 403.
- Pembatasan laju disimpan di Postgres (tabel `barber.rate_limits`, upsert atomik, jendela 10 menit, maksimal 12 percobaan per IP). Alamat IP disimpan dalam bentuk hash.
- Tabel ada di schema privat `barber`. Migrasi mencabut akses role `anon` dan `authenticated` Supabase, sehingga Data API tidak bisa membaca tabel ini.
- Endpoint publik hanya mengirim daftar layanan, status jam (kosong/terisi/lewat), dan hasil reservasi milik pengirim. Nama dan kontak pelanggan lain tidak pernah dikirim ke browser. Ini juga diuji di B4.
- Log server menyamarkan nomor telepon dan email, dan hanya mencatat kode serta pesan error, tanpa parameter query.
- Header: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- `.env` dan `.data/` tidak masuk git. Halaman `/og` (kanvas gambar pratinjau) hanya aktif saat dev dan mengembalikan 404 di produksi.

## Hasil tes dan verifikasi (lokal, 24 Nov 2026)

| Pemeriksaan | Perintah / cara | Hasil |
|---|---|---|
| Tipe | `npm run check` | 0 error, 0 warning |
| Lint | `npm run lint` | bersih |
| Tes aturan bisnis | `npm test` | 18/18 lulus (B1–B4, seed/migrasi idempoten, rate limit) |
| Build | `npm run build` | kompilasi lulus; symlink adapter Vercel ditolak Windows (lihat catatan) |
| Build produksi lokal | `npm run build:local` + `start:local` | lulus; `/` 200, `/og` 404, CSRF lintas origin 403, POST same-origin 200 |
| B1 di browser (1440 px) | Potong Rapi, Rab 25 Nov 14.30 | Kartu janji Rp55.000; `npm run agenda` menampilkan entri; jam 14.30 tertutup setelah dimuat ulang |
| B2 di browser (2 tab) | Dua sesi memilih 16.00 | Tab kedua menang. Tab pertama melihat "Jam 16.00 baru saja dipesan pelanggan lain" dengan alternatif 15.15/16.45/17.30; nama dan nomor tetap terisi; memilih 16.45 berhasil |
| B3 lewat HTTP | Senin, jam lampau, 10.30, 31 Des, layanan palsu | Kelimanya 400 dengan pesan di field terkait; tidak ada baris baru |
| B4 di HP (390 px) | 12 slot Sab 28 Nov diisi | Strip tanggal menandai "Penuh"; pesan "Jadwal Sab, 28 November penuh" dengan tombol ke Min, 29 Nov |
| Restart | Postgres dihentikan lalu dinyalakan ulang | Agenda masih memuat 3 reservasi |
| Layout | 390 px dan 1440 px | Tidak ada scroll horizontal; bilah ringkasan di HP tidak menutupi tombol |

Environment yang diuji: Windows 11, Node 24.11.1, Postgres tertanam 19 (beta) lokal. Vercel Preview dan Production belum diuji.

## Deploy ke Vercel

1. **Database.** Buat satu proyek Supabase untuk Production, dan sebaiknya satu lagi (atau branch) untuk Preview. Ambil *connection string* tipe **Transaction pooler** (port 6543).
2. **Migrasi dan seed** dari terminal, terpisah dari build:
   ```powershell
   $env:DATABASE_URL = "<url pooler Preview>"; npm run db:setup
   $env:DATABASE_URL = "<url pooler Production>"; npm run db:setup
   ```
   Redeploy tidak menyentuh data karena seed tidak berjalan saat build.
3. **Proyek Vercel.** Impor repo, beri nama misalnya `sela-barber`, lalu atur **Root Directory** ke `01-sela-barber`. Framework SvelteKit terdeteksi otomatis. Build command `npm run build`, install `npm install`.
4. **Environment variables** (Settings → Environment Variables):
   | Nama | Preview | Production |
   |---|---|---|
   | `DATABASE_URL` | URL pooler database Preview | URL pooler database Production |
5. **Uji Preview.** Buat satu reservasi dari HP, cek dengan `npm run agenda` memakai URL Preview, ulangi uji perebutan slot di dua tab, lalu pastikan database Production tidak berubah.
6. **Production.** Promote, buka URL produksi di jendela privat, periksa gambar pratinjau (`/og.jpg`), buat satu reservasi sintetis, lalu redeploy dan pastikan reservasi itu masih ada.

Metadata berbagi memakai origin permintaan. Di Vercel, `og:image` otomatis menjadi URL absolut domain produksi, misalnya `https://sela-barber.vercel.app/og.jpg`. Bagikan tautan beranda (`/`) di Threads, bukan tautan hasil reservasi.

## Konten Threads

**Caption (siap edit):**

> Pelanggan barbershop sering tanya lewat DM: "Besok sore masih ada kursi kosong?"
>
> Saya buat demo reservasi untuk barbershop satu kursi. Pelanggan lihat harga, pilih jam yang masih kosong, lalu dapat kode reservasi. Begitu terisi, jam itu langsung tertutup buat pelanggan lain, jadi tidak ada jadwal dobel.
>
> Coba dari HP (data contoh saja): [tautan]
>
> Punya barbershop atau salon dan mau jadwal seperti ini? Balas atau DM, kita ngobrol soal alurnya.

**Alur rekam layar 20 detik (HP, 390 px):**

| Detik | Layar | Teks di layar |
|---|---|---|
| 0–4 | Beranda: "SELA BARBER", harga mulai Rp35.000, lalu gulir ke papan harga | "Besok sore masih ada kursi?" |
| 4–15 | Ketuk **Pilih jam** → pilih Potong Rapi → pilih tanggal → ketuk 14.30 → **Isi contoh** → **Konfirmasi reservasi** | "Pilih jam yang masih kosong" |
| 15–20 | Kartu janji "14.30 WIB" + kode SB-…, lalu kembali ke jadwal: 14.30 dicoret "Terisi" | "Jam terisi langsung tertutup. Mau untuk usahamu? DM." |

## Aset dan lisensi

| File | Sumber | Lisensi |
|---|---|---|
| `static/foto/hero-gunting*.webp` | Brian Silva, [pexels.com/photo/39559303](https://www.pexels.com/photo/39559303/) | [Lisensi Pexels](https://www.pexels.com/license/) (bebas dipakai, atribusi tidak wajib) |
| `static/foto/detail-alat.webp` | František Čaník, [pexels.com/photo/20785314](https://www.pexels.com/photo/20785314/) | Lisensi Pexels |
| `static/og.jpg` | Tangkapan halaman `/og` proyek ini (1200×630) | Milik proyek |
| Font Barlow Condensed, Public Sans | Fontsource (dibundel lokal) | SIL Open Font License |

Untuk membuat ulang `og.jpg`, jalankan `npm run dev`, buka `/og` di viewport 1200×630, lalu simpan tangkapan layarnya ke `static/og.jpg`.

## Struktur

```
db/migrations/001_init.sql     skema barber (services, bookings, rate_limits)
scripts/                       db-local, migrate, seed, agenda, images, start-local
src/lib/schedule.ts            aturan jadwal WIB (murni, dipakai server/klien/CLI/tes)
src/lib/server/booking.ts      reservasi, ketersediaan, agenda pemilik
src/lib/server/rate-limit.ts   pembatasan laju berbasis Postgres
src/routes/+page.svelte        beranda dan papan harga
src/routes/reservasi/          pemilih layanan → tanggal → jam → data → kartu janji
tests/booking.test.ts          skenario B1–B4
```
