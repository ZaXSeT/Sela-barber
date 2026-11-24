/** npm run db:seed — mengisi katalog layanan contoh. Aman dijalankan ulang. */
import postgres from 'postgres';
import { databaseUrl } from './lib/env';
import { seed } from './lib/seed-core';

const sql = postgres(databaseUrl(), { max: 1, prepare: false, onnotice: () => {} });
try {
	const n = await seed(sql);
	const [{ services }] = await sql<{ services: number }[]>`select count(*)::int as services from barber.services`;
	const [{ bookings }] = await sql<{ bookings: number }[]>`select count(*)::int as bookings from barber.bookings`;
	console.log(`Seed selesai: ${n} layanan diperbarui. Total layanan ${services}, reservasi tersimpan ${bookings}.`);
} finally {
	await sql.end();
}
