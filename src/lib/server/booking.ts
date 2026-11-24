/**
 * Layanan reservasi. Semua fungsi menerima koneksi `sql` agar bisa diuji langsung ke database tes.
 * Keunikan slot dijamin constraint barber.bookings_slot_key; kode ini tidak mengandalkan cek-lalu-tulis.
 */
import type { Sql } from 'postgres';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import {
	SLOT_TIMES,
	bookableDates,
	checkSlot,
	dayBounds,
	isOpenDay,
	slotInstant,
	wibDate,
	wibTime,
	REJECTION_TEXT,
	type SlotRejection
} from '../schedule';

export type Service = {
	id: string;
	name: string;
	price_idr: number;
	duration_min: number;
};

export type SlotStatus = 'tersedia' | 'terisi' | 'lewat';
export type DayStatus = 'buka' | 'penuh' | 'tutup' | 'selesai';

export type PublicBooking = {
	code: string;
	serviceName: string;
	priceIdr: number;
	date: string;
	time: string;
};

export async function listServices(sql: Sql): Promise<Service[]> {
	return sql<Service[]>`
		select id, name, price_idr, duration_min
		from barber.services
		where active
		order by sort_order, id`;
}

/** Waktu mulai yang sudah terisi dalam rentang, sebagai set ISO string. Tanpa data pelanggan. */
async function takenStarts(sql: Sql, from: Date, to: Date): Promise<Set<number>> {
	const rows = await sql<{ starts_at: Date }[]>`
		select starts_at from barber.bookings
		where chair_id = 1 and starts_at >= ${from} and starts_at < ${to}`;
	return new Set(rows.map((r) => r.starts_at.getTime()));
}

function slotStatuses(date: string, taken: Set<number>, now: Date) {
	return SLOT_TIMES.map((time) => {
		const at = slotInstant(date, time).getTime();
		const status: SlotStatus = at <= now.getTime() ? 'lewat' : taken.has(at) ? 'terisi' : 'tersedia';
		return { time, status };
	});
}

/** Ketersediaan jam untuk satu tanggal. Pengunjung hanya melihat status, bukan siapa yang memesan. */
export async function dayAvailability(sql: Sql, date: string, now: Date) {
	if (!isOpenDay(date)) return [];
	const { from, to } = dayBounds(date);
	return slotStatuses(date, await takenStarts(sql, from, to), now);
}

/** Ringkasan status semua tanggal dalam rentang reservasi (untuk strip tanggal). */
export async function daysOverview(sql: Sql, now: Date) {
	const dates = bookableDates(now);
	const from = dayBounds(dates[0]).from;
	const to = dayBounds(dates[dates.length - 1]).to;
	const taken = await takenStarts(sql, from, to);
	return dates.map((date) => {
		if (!isOpenDay(date)) return { date, status: 'tutup' as DayStatus, free: 0 };
		const slots = slotStatuses(date, taken, now);
		const free = slots.filter((s) => s.status === 'tersedia').length;
		// Hari ini setelah slot terakhir lewat: "selesai", bukan "penuh".
		const status: DayStatus =
			free > 0 ? 'buka' : slots.some((s) => s.status === 'terisi') ? 'penuh' : 'selesai';
		return { date, status, free };
	});
}

/** Hingga `limit` jam tersedia terdekat dengan jam yang gagal, di tanggal yang sama lalu tanggal berikutnya. */
export async function alternatives(sql: Sql, date: string, time: string, now: Date, limit = 3) {
	const days = await daysOverview(sql, now);
	const out: { date: string; time: string }[] = [];
	const target = SLOT_TIMES.indexOf(time);
	for (const day of days.filter((d) => d.date >= date && d.status === 'buka')) {
		const slots = (await dayAvailability(sql, day.date, now)).filter((s) => s.status === 'tersedia');
		if (day.date === date && target >= 0) {
			slots.sort(
				(a, b) =>
					Math.abs(SLOT_TIMES.indexOf(a.time) - target) -
					Math.abs(SLOT_TIMES.indexOf(b.time) - target)
			);
		}
		for (const s of slots) {
			out.push({ date: day.date, time: s.time });
			if (out.length >= limit) return out;
		}
	}
	return out;
}

// ——— Validasi input ———

/** Nomor WhatsApp Indonesia: 08…, 628…, atau +628…, 10–15 digit. Disimpan sebagai +62… */
export function normalizeWhatsapp(raw: string): string | null {
	const digits = raw.replace(/[\s\-().]/g, '');
	const m = /^(?:\+62|62|0)(8\d{8,12})$/.exec(digits);
	return m ? `+62${m[1]}` : null;
}

export const bookingInput = z.object({
	serviceId: z
		.string({ error: 'Pilih layanan.' })
		.regex(/^[a-z0-9-]{1,40}$/, { error: 'Pilih layanan dari papan harga.' }),
	date: z.string({ error: 'Pilih tanggal.' }).max(10, { error: 'Pilih tanggal.' }),
	time: z.string({ error: 'Pilih jam.' }).max(5, { error: 'Pilih jam.' }),
	name: z
		.string({ error: 'Isi nama panggilan.' })
		.trim()
		.min(2, { error: 'Nama panggilan minimal 2 huruf.' })
		.max(40, { error: 'Nama panggilan maksimal 40 karakter.' })
		.regex(/^[\p{L}\p{M} .'-]+$/u, { error: 'Gunakan huruf, spasi, titik, atau tanda hubung.' }),
	contact: z
		.string({ error: 'Isi nomor WhatsApp.' })
		.max(24, { error: 'Nomor WhatsApp terlalu panjang.' })
		.transform((v, ctx) => {
			const n = normalizeWhatsapp(v);
			if (!n) {
				ctx.addIssue({
					code: 'custom',
					message: 'Tulis nomor WhatsApp seperti 0812 3456 7890.'
				});
				return z.NEVER;
			}
			return n;
		})
});

export type BookingFieldErrors = Partial<Record<'serviceId' | 'date' | 'time' | 'name' | 'contact', string>>;

export type CreateBookingResult =
	| { ok: true; booking: PublicBooking }
	| { ok: false; kind: 'invalid'; errors: BookingFieldErrors }
	| { ok: false; kind: 'slot'; reason: SlotRejection; errors: BookingFieldErrors }
	| { ok: false; kind: 'taken'; alternatives: { date: string; time: string }[] };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCode(): string {
	let s = '';
	for (let i = 0; i < 6; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
	return `SB-${s}`;
}

function isUniqueViolation(e: unknown, constraint: string): boolean {
	const err = e as { code?: string; constraint_name?: string };
	return err?.code === '23505' && err.constraint_name === constraint;
}

export async function createBooking(
	sql: Sql,
	raw: Record<string, unknown>,
	now: Date = new Date()
): Promise<CreateBookingResult> {
	const parsed = bookingInput.safeParse(raw);
	if (!parsed.success) {
		const errors: BookingFieldErrors = {};
		for (const issue of parsed.error.issues) {
			const key = issue.path[0] as keyof BookingFieldErrors;
			if (key && !errors[key]) errors[key] = issue.message;
		}
		return { ok: false, kind: 'invalid', errors };
	}
	const input = parsed.data;

	const rejection = checkSlot(input.date, input.time, now);
	if (rejection) {
		const field = rejection === 'format_jam' || rejection === 'di_luar_kisi' || rejection === 'sudah_lewat' ? 'time' : 'date';
		return { ok: false, kind: 'slot', reason: rejection, errors: { [field]: REJECTION_TEXT[rejection] } };
	}

	const [service] = await sql<Service[]>`
		select id, name, price_idr, duration_min from barber.services
		where id = ${input.serviceId} and active`;
	if (!service) {
		return { ok: false, kind: 'invalid', errors: { serviceId: 'Layanan itu tidak tersedia. Pilih dari papan harga.' } };
	}

	const startsAt = slotInstant(input.date, input.time);

	for (let attempt = 0; attempt < 5; attempt++) {
		const code = generateCode();
		try {
			// ON CONFLICT pada constraint slot: tepat satu permintaan menang, sisanya mendapat 0 baris.
			const rows = await sql<{ code: string; starts_at: Date }[]>`
				insert into barber.bookings
					(code, service_id, chair_id, starts_at, service_name, price_idr, customer_name, customer_contact)
				values
					(${code}, ${service.id}, 1, ${startsAt}, ${service.name}, ${service.price_idr}, ${input.name}, ${input.contact})
				on conflict on constraint bookings_slot_key do nothing
				returning code, starts_at`;
			if (rows.length === 0) {
				return {
					ok: false,
					kind: 'taken',
					alternatives: await alternatives(sql, input.date, input.time, now)
				};
			}
			return {
				ok: true,
				booking: {
					code: rows[0].code,
					serviceName: service.name,
					priceIdr: service.price_idr,
					date: wibDate(rows[0].starts_at),
					time: wibTime(rows[0].starts_at)
				}
			};
		} catch (e) {
			if (isUniqueViolation(e, 'bookings_code_key')) continue; // kode bentrok: coba kode lain
			throw e;
		}
	}
	throw new Error('Gagal membuat kode reservasi unik setelah 5 percobaan.');
}

/** Agenda pemilik untuk satu tanggal (berisi kontak — hanya untuk CLI pemilik). */
export async function ownerAgenda(sql: Sql, date: string) {
	const { from, to } = dayBounds(date);
	return sql<
		{
			code: string;
			starts_at: Date;
			service_name: string;
			price_idr: number;
			customer_name: string;
			customer_contact: string;
			created_at: Date;
		}[]
	>`
		select code, starts_at, service_name, price_idr, customer_name, customer_contact, created_at
		from barber.bookings
		where starts_at >= ${from} and starts_at < ${to}
		order by starts_at`;
}
