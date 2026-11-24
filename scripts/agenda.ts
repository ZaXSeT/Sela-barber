/**
 * Akses pemilik: agenda reservasi per tanggal.
 *   npm run agenda                       → hari ini (WIB)
 *   npm run agenda -- --tanggal 2026-11-25
 *   npm run agenda -- --besok
 */
import postgres from 'postgres';
import { argValue, databaseUrl } from './lib/env';
import { ownerAgenda } from '../src/lib/server/booking';
import {
	addDays,
	displayTime,
	isOpenDay,
	longDate,
	parseDate,
	rupiah,
	SLOT_TIMES,
	wibDate,
	wibTime
} from '../src/lib/schedule';

const today = wibDate(new Date());
const date = process.argv.includes('--besok') ? addDays(today, 1) : (argValue('tanggal') ?? today);
if (!parseDate(date)) {
	console.error('Format tanggal: --tanggal YYYY-MM-DD');
	process.exit(1);
}

const sql = postgres(databaseUrl(), { max: 1, prepare: false, onnotice: () => {} });
try {
	const rows = await ownerAgenda(sql, date);
	console.log(`\nAgenda Sela Barber · ${longDate(date)}`);
	if (!isOpenDay(date)) console.log('(Senin: toko tutup)');
	console.log('─'.repeat(78));
	if (rows.length === 0) {
		console.log('Belum ada reservasi.');
	} else {
		console.log(
			['Jam', 'Kode', 'Layanan', 'Harga', 'Nama', 'WhatsApp'].map((h, i) => h.padEnd([7, 11, 18, 10, 14, 0][i])).join('')
		);
		for (const r of rows) {
			console.log(
				[
					displayTime(wibTime(r.starts_at)).padEnd(7),
					r.code.padEnd(11),
					r.service_name.padEnd(18),
					rupiah(r.price_idr).padEnd(10),
					r.customer_name.slice(0, 13).padEnd(14),
					r.customer_contact
				].join('')
			);
		}
	}
	console.log('─'.repeat(78));
	const total = rows.reduce((s, r) => s + r.price_idr, 0);
	console.log(
		`${rows.length} dari ${isOpenDay(date) ? SLOT_TIMES.length : 0} slot terisi · perkiraan pendapatan ${rupiah(total)}\n`
	);
} finally {
	await sql.end();
}
