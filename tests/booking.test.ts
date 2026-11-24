import postgres from 'postgres';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createBooking, dayAvailability, daysOverview, listServices, ownerAgenda } from '../src/lib/server/booking';
import { hitRateLimit } from '../src/lib/server/rate-limit';
import { SLOT_TIMES, addDays, slotInstant } from '../src/lib/schedule';
import { seed } from '../scripts/lib/seed-core';
import { migrate } from '../scripts/lib/migrate-core';

const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 4, onnotice: () => {} });

// "Sekarang" tetap: Selasa 24 November 2026, 08.00 WIB.
const NOW = new Date('2026-11-24T01:00:00Z');
const TODAY = '2026-11-24';
const WED = '2026-11-25';
const MON = '2026-11-30';

const pelanggan = { name: 'Raka', contact: '0812 0000 0101' };

beforeEach(async () => {
	await sql`truncate barber.bookings, barber.rate_limits restart identity`;
	await seed(sql);
});

afterAll(async () => {
	await sql.end();
});

describe('B1 · reservasi satu slot tersedia', () => {
	it('menyimpan Potong Rapi Rp55.000 dan menutup slot setelah dimuat ulang', async () => {
		const res = await createBooking(sql, { serviceId: 'potong-rapi', date: WED, time: '14:30', ...pelanggan }, NOW);
		expect(res.ok).toBe(true);
		if (!res.ok) return;
		expect(res.booking).toMatchObject({ serviceName: 'Potong Rapi', priceIdr: 55_000, date: WED, time: '14:30' });
		expect(res.booking.code).toMatch(/^SB-[A-Z2-9]{6}$/);

		const agenda = await ownerAgenda(sql, WED);
		expect(agenda).toHaveLength(1);
		expect(agenda[0]).toMatchObject({ code: res.booking.code, price_idr: 55_000, customer_contact: '+6281200000101' });

		const slots = await dayAvailability(sql, WED, NOW);
		expect(slots.find((s) => s.time === '14:30')?.status).toBe('terisi');
		expect(slots.filter((s) => s.status === 'tersedia')).toHaveLength(SLOT_TIMES.length - 1);
	});

	it('menyimpan waktu mulai kanonis UTC (14.30 WIB = 07.30 UTC)', async () => {
		await createBooking(sql, { serviceId: 'potong-rapi', date: WED, time: '14:30', ...pelanggan }, NOW);
		const [row] = await sql<{ starts_at: Date }[]>`select starts_at from barber.bookings`;
		expect(row.starts_at.toISOString()).toBe('2026-11-25T07:30:00.000Z');
	});

	it('harga diambil dari server, bukan dari isian browser', async () => {
		const res = await createBooking(
			sql,
			{ serviceId: 'potong-rapi', date: WED, time: '10:00', price: 1, priceIdr: 1, ...pelanggan },
			NOW
		);
		expect(res.ok && res.booking.priceIdr).toBe(55_000);
	});
});

describe('B2 · dua sesi berebut slot yang sama', () => {
	it('tepat satu baris tersimpan; yang kalah mendapat jam alternatif', async () => {
		const input = { serviceId: 'potong-keramas', date: WED, time: '16:00' };
		const results = await Promise.all([
			createBooking(sql, { ...input, name: 'Dimas', contact: '081200000202' }, NOW),
			createBooking(sql, { ...input, name: 'Bayu', contact: '081200000303' }, NOW),
			createBooking(sql, { ...input, name: 'Galih', contact: '081200000404' }, NOW)
		]);
		expect(results.filter((r) => r.ok)).toHaveLength(1);
		const losers = results.filter((r) => !r.ok);
		expect(losers).toHaveLength(2);
		for (const l of losers) {
			expect(l.ok === false && l.kind).toBe('taken');
			if (l.ok === false && l.kind === 'taken') {
				expect(l.alternatives.length).toBeGreaterThan(0);
				expect(l.alternatives.some((a) => a.date === WED && a.time === '16:00')).toBe(false);
				// Jam terdekat di tanggal yang sama ditawarkan lebih dulu.
				expect(['15:15', '16:45']).toContain(l.alternatives[0].time);
			}
		}
		const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from barber.bookings`;
		expect(n).toBe(1);
	});
});

describe('B3 · server menolak slot yang tidak sah', () => {
	const at = new Date('2026-11-24T05:00:00Z'); // 12.00 WIB
	const cases: [string, Record<string, string>, string][] = [
		['hari Senin', { date: MON, time: '10:00' }, 'date'],
		['jam lampau', { date: TODAY, time: '10:45' }, 'time'],
		['di luar kisi 45 menit', { date: WED, time: '10:30' }, 'time'],
		['jam penutupan 19.00', { date: WED, time: '19:00' }, 'time'],
		['tanggal di luar rentang', { date: addDays(TODAY, 31), time: '10:00' }, 'date'],
		['tanggal kemarin', { date: addDays(TODAY, -1), time: '10:00' }, 'date'],
		['tanggal tidak ada', { date: '2026-02-30', time: '10:00' }, 'date'],
		['format jam aneh', { date: WED, time: '9:00' }, 'time']
	];
	for (const [label, slot, field] of cases) {
		it(`menolak ${label}`, async () => {
			const res = await createBooking(sql, { serviceId: 'potong-rapi', ...slot, ...pelanggan }, at);
			expect(res.ok).toBe(false);
			if (!res.ok && 'errors' in res) expect(Object.keys(res.errors)).toContain(field);
			const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from barber.bookings`;
			expect(n).toBe(0);
		});
	}

	it('menolak layanan tak dikenal, nama kosong, dan nomor salah', async () => {
		const res = await createBooking(
			sql,
			{ serviceId: 'cukur-gratis', date: WED, time: '10:00', name: ' ', contact: '12345' },
			at
		);
		expect(res.ok).toBe(false);
		if (!res.ok && res.kind === 'invalid') {
			expect(Object.keys(res.errors).sort()).toEqual(['contact', 'name']);
		}
		const res2 = await createBooking(sql, { serviceId: 'cukur-gratis', date: WED, time: '10:00', ...pelanggan }, at);
		expect(res2.ok === false && res2.kind === 'invalid' && res2.errors.serviceId).toBeTruthy();
	});

	it('slot 18.15 pada hari buka mendatang bisa dipesan', async () => {
		const res = await createBooking(sql, { serviceId: 'rapikan-janggut', date: WED, time: '18:15', ...pelanggan }, at);
		expect(res.ok).toBe(true);
		const [row] = await sql<{ starts_at: Date }[]>`select starts_at from barber.bookings`;
		expect(row.starts_at.getTime()).toBe(slotInstant(WED, '18:15').getTime());
	});
});

describe('B4 · semua slot sebuah tanggal terisi', () => {
	it('tanggal ditandai penuh dan tanggal buka lain tetap bisa dipilih', async () => {
		for (const [i, time] of SLOT_TIMES.entries()) {
			const res = await createBooking(
				sql,
				{ serviceId: 'potong-rapi', date: WED, time, name: `Tamu ${String.fromCharCode(65 + i)}`, contact: `08120000${1000 + i}` },
				NOW
			);
			expect(res.ok).toBe(true);
		}
		const days = await daysOverview(sql, NOW);
		expect(days.find((d) => d.date === WED)).toMatchObject({ status: 'penuh', free: 0 });
		expect(days.find((d) => d.date === MON)?.status).toBe('tutup');
		expect(days.find((d) => d.date === '2026-11-26')?.status).toBe('buka');
		// Data publik hanya status: tidak ada nama atau kontak.
		expect(JSON.stringify(days)).not.toMatch(/Tamu|0812|\+62/);
		const slots = await dayAvailability(sql, WED, NOW);
		expect(JSON.stringify(slots)).not.toMatch(/Tamu|0812|\+62/);

		const res = await createBooking(sql, { serviceId: 'potong-rapi', date: WED, time: '12:15', ...pelanggan }, NOW);
		expect(res.ok === false && res.kind).toBe('taken');
		if (res.ok === false && res.kind === 'taken') {
			expect(res.alternatives[0].date).toBe('2026-11-26');
		}
	});

	it('hari ini ditandai selesai setelah jam terakhir lewat, penuh bila sisa slot terisi', async () => {
		const late = new Date('2026-11-24T11:20:00Z'); // 18.20 WIB
		expect((await daysOverview(sql, late))[0]).toMatchObject({ date: TODAY, status: 'selesai', free: 0 });

		const at17 = new Date('2026-11-24T10:00:00Z'); // 17.00 WIB: tersisa 17.30 dan 18.15
		for (const time of ['17:30', '18:15']) {
			expect((await createBooking(sql, { serviceId: 'potong-rapi', date: TODAY, time, ...pelanggan }, at17)).ok).toBe(true);
		}
		expect((await daysOverview(sql, at17))[0]).toMatchObject({ date: TODAY, status: 'penuh', free: 0 });
	});
});

describe('Inisialisasi dan pembatasan laju', () => {
	it('seed dan migrasi aman diulang tanpa menggandakan katalog atau menghapus reservasi', async () => {
		await createBooking(sql, { serviceId: 'potong-rapi', date: WED, time: '11:30', ...pelanggan }, NOW);
		await seed(sql);
		await seed(sql);
		expect(await migrate(sql, () => {})).toEqual([]);
		expect(await listServices(sql)).toHaveLength(3);
		const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from barber.bookings`;
		expect(n).toBe(1);
	});

	it('membatasi pengiriman per klien dalam satu jendela', async () => {
		const opts = { action: 'reservasi', client: '203.0.113.9', limit: 3, windowSec: 600 };
		const hits = [];
		for (let i = 0; i < 4; i++) hits.push((await hitRateLimit(sql, opts)).allowed);
		expect(hits).toEqual([true, true, true, false]);
		expect((await hitRateLimit(sql, { ...opts, client: '203.0.113.10' })).allowed).toBe(true);
		const [{ key }] = await sql<{ key: string }[]>`select key from barber.rate_limits limit 1`;
		expect(key).not.toContain('203.0.113');
	});
});
