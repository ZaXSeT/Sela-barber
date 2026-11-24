/**
 * Katalog layanan contoh. Sumber kebenaran harga saat runtime tetap tabel barber.services;
 * daftar ini hanya dipakai oleh skrip seed (ID stabil, aman dijalankan ulang).
 */
export const SEED_SERVICES = [
	{
		id: 'potong-rapi',
		name: 'Potong Rapi',
		price_idr: 55_000,
		duration_min: 35,
		sort_order: 1
	},
	{
		id: 'potong-keramas',
		name: 'Potong + Keramas',
		price_idr: 70_000,
		duration_min: 45,
		sort_order: 2
	},
	{
		id: 'rapikan-janggut',
		name: 'Rapikan Janggut',
		price_idr: 35_000,
		duration_min: 20,
		sort_order: 3
	}
] as const;

/** Keterangan singkat per layanan untuk papan harga. */
export const SERVICE_NOTES: Record<string, string> = {
	'potong-rapi': 'Konsultasi bentuk, potong gunting dan clipper, finishing pomade.',
	'potong-keramas': 'Semua langkah Potong Rapi, ditambah keramas dan pijat kepala singkat.',
	'rapikan-janggut': 'Bentuk garis janggut, handuk hangat, dan pisau cukur untuk tepi.'
};

export const SHOP = {
	name: 'Sela Barber',
	area: 'Cihapit, Bandung',
	address: 'Jl. Cihapit No. 27 (alamat contoh), Bandung',
	hours: 'Selasa–Minggu, 10.00–19.00 WIB',
	closed: 'Senin tutup'
} as const;
