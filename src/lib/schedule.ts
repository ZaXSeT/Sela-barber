/**
 * Aturan jadwal Sela Barber. Modul murni (tanpa I/O) sehingga dipakai server, browser, CLI, dan tes.
 *
 * - Zona waktu toko: Asia/Jakarta (WIB, UTC+7, tanpa daylight saving).
 * - Buka Selasa–Minggu 10.00–19.00, Senin tutup.
 * - Slot mulai setiap 45 menit; slot terakhir 18.15 (selesai 19.00). Satu reservasi = satu slot penuh.
 * - Tanggal yang bisa dipilih: hari ini sampai 30 hari ke depan (WIB).
 */

export const WIB_OFFSET_MIN = 7 * 60;
export const OPEN_MIN = 10 * 60;
export const CLOSE_MIN = 19 * 60;
export const SLOT_MIN = 45;
export const RANGE_DAYS = 30;
export const CLOSED_WEEKDAY = 1; // Senin (0 = Minggu)

const pad = (n: number) => String(n).padStart(2, '0');

export const SLOT_TIMES: readonly string[] = (() => {
	const out: string[] = [];
	for (let m = OPEN_MIN; m + SLOT_MIN <= CLOSE_MIN; m += SLOT_MIN) {
		out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
	}
	return out;
})();

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

/** Tanggal kalender WIB (YYYY-MM-DD) untuk sebuah instan. */
export function wibDate(instant: Date): string {
	const shifted = new Date(instant.getTime() + WIB_OFFSET_MIN * 60_000);
	return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Jam WIB (HH:MM) untuk sebuah instan. */
export function wibTime(instant: Date): string {
	const shifted = new Date(instant.getTime() + WIB_OFFSET_MIN * 60_000);
	return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

/** Mengurai YYYY-MM-DD menjadi komponen, menolak tanggal yang tidak ada (mis. 2026-02-30). */
export function parseDate(date: string): { y: number; m: number; d: number } | null {
	const match = DATE_RE.exec(date);
	if (!match) return null;
	const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
	const probe = new Date(Date.UTC(y, m - 1, d));
	if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
		return null;
	}
	return { y, m, d };
}

export function addDays(date: string, days: number): string {
	const p = parseDate(date);
	if (!p) throw new Error(`Tanggal tidak valid: ${date}`);
	const t = new Date(Date.UTC(p.y, p.m - 1, p.d + days));
	return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function weekday(date: string): number {
	const p = parseDate(date);
	if (!p) throw new Error(`Tanggal tidak valid: ${date}`);
	return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
}

export function isOpenDay(date: string): boolean {
	return weekday(date) !== CLOSED_WEEKDAY;
}

/** Instan UTC kanonis untuk tanggal + jam WIB. */
export function slotInstant(date: string, time: string): Date {
	const p = parseDate(date);
	const t = TIME_RE.exec(time);
	if (!p || !t) throw new Error(`Slot tidak valid: ${date} ${time}`);
	return new Date(Date.UTC(p.y, p.m - 1, p.d, Number(t[1]), Number(t[2])) - WIB_OFFSET_MIN * 60_000);
}

/** Batas awal dan akhir (eksklusif) satu hari WIB dalam UTC. */
export function dayBounds(date: string): { from: Date; to: Date } {
	return { from: slotInstant(date, '00:00'), to: slotInstant(addDays(date, 1), '00:00') };
}

/** Semua tanggal yang boleh dipilih: hari ini (WIB) sampai RANGE_DAYS hari ke depan. */
export function bookableDates(now: Date): string[] {
	const today = wibDate(now);
	return Array.from({ length: RANGE_DAYS + 1 }, (_, i) => addDays(today, i));
}

export type SlotRejection =
	| 'format_tanggal'
	| 'format_jam'
	| 'di_luar_rentang'
	| 'hari_tutup'
	| 'di_luar_kisi'
	| 'sudah_lewat';

/** Pemeriksaan server untuk tanggal + jam yang diajukan. null berarti slot sah. */
export function checkSlot(date: string, time: string, now: Date): SlotRejection | null {
	if (!parseDate(date)) return 'format_tanggal';
	if (!TIME_RE.test(time)) return 'format_jam';
	const today = wibDate(now);
	const last = addDays(today, RANGE_DAYS);
	if (date < today || date > last) return 'di_luar_rentang';
	if (!isOpenDay(date)) return 'hari_tutup';
	if (!SLOT_TIMES.includes(time)) return 'di_luar_kisi';
	if (slotInstant(date, time).getTime() <= now.getTime()) return 'sudah_lewat';
	return null;
}

export const REJECTION_TEXT: Record<SlotRejection, string> = {
	format_tanggal: 'Tanggal tidak dikenali. Pilih tanggal dari daftar.',
	format_jam: 'Jam tidak dikenali. Pilih jam dari daftar.',
	di_luar_rentang: 'Reservasi hanya bisa untuk hari ini sampai 30 hari ke depan.',
	hari_tutup: 'Senin kami tutup. Pilih hari Selasa sampai Minggu.',
	di_luar_kisi: 'Jam mulai harus mengikuti slot 45 menit yang tersedia.',
	sudah_lewat: 'Jam itu sudah lewat. Pilih jam berikutnya.'
};

// ——— Format tampilan (bahasa Indonesia) ———

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BULAN = [
	'Januari',
	'Februari',
	'Maret',
	'April',
	'Mei',
	'Juni',
	'Juli',
	'Agustus',
	'September',
	'Oktober',
	'November',
	'Desember'
];

export function dayName(date: string): string {
	return HARI[weekday(date)];
}
export function dayShort(date: string): string {
	return HARI_PENDEK[weekday(date)];
}
export function monthName(date: string): string {
	return BULAN[parseDate(date)!.m - 1];
}
export function dayOfMonth(date: string): number {
	return parseDate(date)!.d;
}
/** "Rabu, 25 November 2026" */
export function longDate(date: string): string {
	const p = parseDate(date)!;
	return `${dayName(date)}, ${p.d} ${BULAN[p.m - 1]} ${p.y}`;
}
/** "Rab, 25 Nov" */
export function shortDate(date: string): string {
	const p = parseDate(date)!;
	return `${dayShort(date)}, ${p.d} ${BULAN[p.m - 1].slice(0, 3)}`;
}
/** "14.30" — notasi jam Indonesia memakai titik. */
export function displayTime(time: string): string {
	return time.replace(':', '.');
}
export function rupiah(n: number): string {
	return 'Rp' + n.toLocaleString('id-ID').replace(/,/g, '.');
}
