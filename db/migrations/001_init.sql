-- Sela Barber · skema awal
-- Semua tabel berada di schema privat "barber". Schema ini tidak diekspos Data API Supabase;
-- aplikasi mengaksesnya hanya dari fungsi server lewat DATABASE_URL.

create schema if not exists barber;

create table barber.services (
	id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
	name text not null check (char_length(name) between 1 and 60),
	price_idr integer not null check (price_idr > 0),
	duration_min integer not null check (duration_min between 5 and 45),
	sort_order integer not null default 0,
	active boolean not null default true
);

create table barber.bookings (
	id bigint generated always as identity primary key,
	code text not null,
	service_id text not null references barber.services (id),
	chair_id smallint not null default 1,
	-- Waktu mulai kanonis dalam UTC. Ditampilkan sebagai WIB (Asia/Jakarta, UTC+7).
	starts_at timestamptz not null,
	-- Ringkasan harga dan nama layanan saat dipesan, agar perubahan katalog tidak mengubah riwayat.
	service_name text not null,
	price_idr integer not null check (price_idr > 0),
	customer_name text not null check (char_length(customer_name) between 1 and 40),
	customer_contact text not null check (char_length(customer_contact) between 8 and 20),
	created_at timestamptz not null default now(),
	constraint bookings_code_key unique (code),
	-- Satu kursi, satu waktu mulai: dijaga oleh database, bukan oleh aplikasi.
	constraint bookings_slot_key unique (chair_id, starts_at),
	constraint bookings_grid check (
		extract(second from starts_at) = 0
	)
);

create index bookings_starts_at_idx on barber.bookings (starts_at);

-- Pembatasan laju lintas instance serverless: penghitung atomik dengan jendela waktu.
create table barber.rate_limits (
	key text primary key,
	window_start timestamptz not null,
	hits integer not null
);

-- Di Supabase, pastikan role publik Data API tidak punya akses ke schema ini.
do $$
begin
	if exists (select 1 from pg_roles where rolname = 'anon') then
		execute 'revoke all on schema barber from anon';
		execute 'revoke all on all tables in schema barber from anon';
	end if;
	if exists (select 1 from pg_roles where rolname = 'authenticated') then
		execute 'revoke all on schema barber from authenticated';
		execute 'revoke all on all tables in schema barber from authenticated';
	end if;
end
$$;
