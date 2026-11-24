import { fail } from '@sveltejs/kit';
import { db } from '#lib/server/db.ts';
import { createBooking, dayAvailability, daysOverview, listServices } from '#lib/server/booking.ts';
import { hitRateLimit } from '#lib/server/rate-limit.ts';
import { logError } from '#lib/server/log.ts';
import { parseDate } from '#lib/schedule.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	// Ketersediaan berubah setiap ada reservasi: jangan di-cache.
	setHeaders({ 'cache-control': 'no-store' });
	const sql = db();
	const now = new Date();
	const [services, days] = await Promise.all([listServices(sql), daysOverview(sql, now)]);

	const requestedService = url.searchParams.get('layanan');
	const serviceId = services.some((s) => s.id === requestedService) ? requestedService : null;

	const requestedDate = url.searchParams.get('tanggal') ?? '';
	const inRange = parseDate(requestedDate) && days.some((d) => d.date === requestedDate);
	// Tanpa pilihan, buka tanggal buka berikutnya yang masih punya slot.
	const date = inRange ? requestedDate : (days.find((d) => d.status === 'buka')?.date ?? days[0].date);

	return {
		services,
		days,
		serviceId,
		date,
		slots: await dayAvailability(sql, date, now)
	};
};

function text(form: FormData, key: string): string {
	const v = form.get(key);
	return typeof v === 'string' ? v : '';
}

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		const form = await request.formData();
		const values = {
			serviceId: text(form, 'serviceId').slice(0, 40),
			date: text(form, 'date').slice(0, 10),
			time: text(form, 'time').slice(0, 5),
			name: text(form, 'name').slice(0, 60),
			contact: text(form, 'contact').slice(0, 30)
		};
		const sql = db();

		try {
			const limit = await hitRateLimit(sql, {
				action: 'reservasi',
				client: getClientAddress(),
				limit: 12,
				windowSec: 600
			});
			if (!limit.allowed) {
				const minutes = Math.ceil(limit.retryAfterSec / 60);
				return fail(429, {
					values,
					message: `Terlalu banyak percobaan reservasi dari perangkat ini. Coba lagi dalam ${minutes} menit.`
				});
			}

			const result = await createBooking(sql, values);
			if (result.ok) return { booking: result.booking };
			if (result.kind === 'taken') {
				return fail(409, {
					values,
					taken: { date: values.date, time: values.time, alternatives: result.alternatives }
				});
			}
			return fail(400, { values, errors: result.errors });
		} catch (e) {
			logError('reservasi', e);
			return fail(503, {
				values,
				message: 'Reservasi belum tersimpan karena server sedang bermasalah. Isian Anda masih ada; coba kirim lagi.'
			});
		}
	}
};
