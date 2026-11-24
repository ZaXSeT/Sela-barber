<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import { SERVICE_NOTES, SHOP } from '#lib/catalog.ts';
	import { rupiah } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const startingPrice = $derived(Math.min(...data.services.map((s) => s.price_idr)));
</script>

<Seo
	title="Sela Barber · Potong rambut di Cihapit, pesan jam lewat HP"
	description="Barbershop satu kursi di Cihapit, Bandung. Lihat harga, pilih jam yang masih kosong, dan simpan kode reservasi. Proyek konsep dengan data contoh."
/>

<section class="hero">
	<div class="wrap hero-grid">
		<div class="hero-text">
			<h1>Sela Barber</h1>
			<p class="where">Barbershop satu kursi di {SHOP.area}.</p>
			<p class="from">
				Potong mulai <strong>{rupiah(startingPrice)}</strong>
			</p>
			<div class="cta">
				<a class="btn" href="/reservasi">Pilih jam</a>
				<p class="hours">{SHOP.hours}<br />{SHOP.closed}</p>
			</div>
		</div>
		<figure class="hero-photo">
			<img
				src="/foto/hero-gunting.webp"
				srcset="/foto/hero-gunting-640.webp 640w, /foto/hero-gunting.webp 960w"
				sizes="(min-width: 60rem) 34rem, 100vw"
				width="960"
				height="1200"
				alt="Tangan barber merapikan potongan rambut pelanggan dengan gunting dan sisir"
				fetchpriority="high"
			/>
		</figure>
	</div>
</section>

<section class="board-section" id="harga" aria-labelledby="harga-judul">
	<div class="wrap">
		<div class="board">
			<div class="board-head">
				<h2 id="harga-judul">Daftar harga</h2>
				<p>Setiap reservasi memakai satu slot 45 menit.</p>
			</div>
			<ul class="rows">
				{#each data.services as s (s.id)}
					<li>
						<div class="line">
							<h3>{s.name}</h3>
							<span class="leader" aria-hidden="true"></span>
							<span class="price">{rupiah(s.price_idr)}</span>
						</div>
						<div class="meta">
							<p><span class="dur">{s.duration_min} menit</span> {SERVICE_NOTES[s.id] ?? ''}</p>
							<a class="pick" href={`/reservasi?layanan=${s.id}`}
								>Pilih jam untuk {s.name}</a
							>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</section>

<section class="info" aria-label="Jam buka dan lokasi">
	<div class="wrap info-grid">
		<div>
			<h2>Jam buka</h2>
			<table>
				<tbody>
					<tr><th scope="row">Selasa–Minggu</th><td>10.00–19.00 WIB</td></tr>
					<tr><th scope="row">Senin</th><td>Tutup</td></tr>
				</tbody>
			</table>
			<p class="small">Slot mulai setiap 45 menit. Slot terakhir 18.15.</p>
		</div>
		<div>
			<h2>Alamat</h2>
			<p>{SHOP.address}</p>
			<p class="small">Satu kursi, satu barber. Datang lima menit sebelum jam reservasi.</p>
		</div>
		<figure class="detail-photo">
			<img
				src="/foto/detail-alat.webp"
				width="900"
				height="1125"
				alt="Clipper, sisir, dan gunting barber tersusun di atas meja kayu"
				loading="lazy"
				decoding="async"
			/>
		</figure>
	</div>
</section>

<style>
	.hero {
		border-bottom: 1px solid var(--rule);
	}
	.hero-grid {
		display: grid;
		gap: 1.5rem;
		padding-block: 1.75rem 2rem;
	}
	h1 {
		font-size: clamp(4.25rem, 19vw, 9.5rem);
		line-height: 0.86;
		letter-spacing: -0.01em;
		text-transform: uppercase;
	}
	.where {
		margin-top: 1rem;
		font-size: 1.2rem;
		max-width: 26ch;
	}
	.from {
		margin-top: 0.35rem;
		font-family: var(--display);
		font-size: 1.9rem;
		font-weight: 500;
	}
	.from strong {
		font-weight: 700;
		color: var(--brick);
	}
	.cta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem 1.25rem;
		margin-top: 1.25rem;
	}
	.cta .btn {
		min-width: 11rem;
		font-size: 1.45rem;
	}
	.hours {
		font-size: 0.95rem;
		color: var(--ink-soft);
	}
	.hero-photo {
		margin: 0;
	}
	.hero-photo img {
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		object-position: 50% 40%;
		border: 1px solid var(--rule);
	}

	.board-section {
		padding-block: 2.5rem;
	}
	.board {
		background: var(--card);
		border-block: 4px double var(--rule);
		padding: 1.25rem clamp(1rem, 4vw, 2.5rem) 0.5rem;
	}
	.board-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.25rem 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--rule);
	}
	.board-head h2 {
		font-size: clamp(2.25rem, 7vw, 3.5rem);
	}
	.board-head p {
		color: var(--ink-soft);
	}
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.rows li {
		padding-block: 1.1rem;
		border-bottom: 1px solid color-mix(in srgb, var(--rule) 35%, transparent);
	}
	.rows li:last-child {
		border-bottom: 0;
	}
	.line {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}
	.line h3 {
		font-size: clamp(1.9rem, 6.5vw, 3rem);
		font-weight: 600;
	}
	.leader {
		flex: 1;
		min-width: 1rem;
		border-bottom: 2px dotted var(--ink-soft);
		transform: translateY(-0.35rem);
	}
	.price {
		font-family: var(--display);
		font-weight: 700;
		font-size: clamp(1.9rem, 6.5vw, 3rem);
		font-variant-numeric: tabular-nums;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem 1.5rem;
		margin-top: 0.4rem;
	}
	.meta p {
		max-width: 52ch;
		color: var(--ink-soft);
	}
	.dur {
		font-weight: 700;
		color: var(--ink);
		margin-right: 0.35rem;
	}
	.pick {
		font-weight: 600;
		color: var(--brick);
		text-underline-offset: 0.2em;
	}

	.info {
		border-top: 1px solid var(--rule);
		padding-block: 2.5rem 3rem;
	}
	.info-grid {
		display: grid;
		gap: 2rem;
	}
	.info h2 {
		font-size: 2rem;
		margin-bottom: 0.75rem;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		max-width: 22rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.45rem 0;
		border-bottom: 1px solid color-mix(in srgb, var(--rule) 30%, transparent);
	}
	th {
		font-weight: 600;
		padding-right: 1rem;
	}
	.small {
		margin-top: 0.75rem;
		font-size: 0.95rem;
		color: var(--ink-soft);
	}
	.detail-photo {
		margin: 0;
	}
	.detail-photo img {
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		border: 1px solid var(--rule);
	}

	@media (min-width: 60rem) {
		.hero-grid {
			grid-template-columns: 1.25fr 1fr;
			align-items: end;
			padding-block: 3rem;
		}
		.hero-photo img,
		.detail-photo img {
			aspect-ratio: 4 / 5;
		}
		.info-grid {
			grid-template-columns: 1fr 1fr 1fr;
		}
	}
</style>
