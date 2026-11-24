// npm run start:local — menjalankan hasil `npm run build:local` seperti server produksi.
// Proteksi CSRF SvelteKit aktif di sini (tidak aktif di `npm run dev`).
process.env.PORT ??= '4171';
process.env.ORIGIN ??= `http://localhost:${process.env.PORT}`;
console.log(`Pratinjau produksi lokal: ${process.env.ORIGIN}`);
await import('../build/index.js');
