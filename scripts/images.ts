/**
 * npm run images — memotong dan mengompres foto sumber (assets-src/raw) ke static/foto dalam WebP.
 * Dijalankan manual saat foto berubah; hasilnya ikut di repo sehingga build tidak bergantung pada sharp.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('static/foto', { recursive: true });

type Job = {
	src: string;
	out: string;
	width: number;
	height: number;
	/** Titik fokus 0–1 untuk pemotongan (x, y). */
	focus: [number, number];
	/** <1 memotong lebih rapat (bagian dari area maksimum). */
	zoom?: number;
};

const jobs: Job[] = [
	{ src: 'pexels-39559303', out: 'hero-gunting', width: 960, height: 1200, focus: [0.62, 0.35] },
	{ src: 'pexels-39559303', out: 'hero-gunting-640', width: 640, height: 800, focus: [0.62, 0.35] },
	// Bagian bawah foto saja: gunting di atas meja kayu, tanpa alas bermerek di atas.
	{ src: 'pexels-20785314', out: 'detail-alat', width: 900, height: 1125, focus: [0.5, 0.62], zoom: 0.78 }
];

for (const job of jobs) {
	const img = sharp(`assets-src/raw/${job.src}.jpg`);
	const meta = await img.metadata();
	const W = meta.width!;
	const H = meta.height!;
	// Potong ke rasio target di sekitar titik fokus, lalu ubah ukuran.
	const ratio = job.width / job.height;
	const cw = Math.round(Math.min(W, Math.round(H * ratio)) * (job.zoom ?? 1));
	const ch = Math.min(H, Math.round(cw / ratio));
	const left = Math.max(0, Math.min(W - cw, Math.round(job.focus[0] * W - cw / 2)));
	const top = Math.max(0, Math.min(H - ch, Math.round(job.focus[1] * H - ch / 2)));
	const info = await img
		.extract({ left, top, width: cw, height: ch })
		.resize(job.width, job.height)
		.webp({ quality: 74, effort: 6 })
		.toFile(`static/foto/${job.out}.webp`);
	console.log(`${job.out}.webp ${info.width}×${info.height} ${(info.size / 1024).toFixed(0)} KB`);
}
