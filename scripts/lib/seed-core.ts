import type { Sql } from 'postgres';
import { SEED_SERVICES } from '../../src/lib/catalog';

/** Seed katalog layanan dengan ID stabil. Aman diulang; tidak menyentuh tabel reservasi. */
export async function seed(sql: Sql): Promise<number> {
	await sql.begin(async (tx) => {
		for (const s of SEED_SERVICES) {
			await tx`
				insert into barber.services (id, name, price_idr, duration_min, sort_order, active)
				values (${s.id}, ${s.name}, ${s.price_idr}, ${s.duration_min}, ${s.sort_order}, true)
				on conflict (id) do update set
					name = excluded.name,
					price_idr = excluded.price_idr,
					duration_min = excluded.duration_min,
					sort_order = excluded.sort_order,
					active = true`;
		}
	});
	return SEED_SERVICES.length;
}
