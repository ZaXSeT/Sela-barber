import { db } from '#lib/server/db.ts';
import { listServices } from '#lib/server/booking.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Harga selalu dibaca dari database, bukan ditulis mati di halaman.
	return { services: await listServices(db()) };
};
