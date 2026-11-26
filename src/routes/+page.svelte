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

<section class="hero" aria-labelledby="judul">
	<div class="hero-text">
		<p class="where">Barbershop satu kursi · {SHOP.area}</p>
		<h1 id="judul">Sela<br />Barber</h1>
		<div class="hero-foot">
			<p class="from">
				Potong mulai <strong>{rupiah(startingPrice)}</strong>
			</p>
			<a class="btn big" href="/reservasi">Pilih jam</a>
			<p class="hours">{SHOP.hours}<br />{SHOP.closed}</p>
		</div>
	</div>
	<figure class="hero-photo">
		<img
			src="/foto/hero-gunting.webp"
			srcset="/foto/hero-gunting-640.webp 640w, /foto/hero-gunting.webp 960w"
			sizes="(min-width: 60rem) 50vw, 100vw"
			width="960"
			height="1200"
			alt="Tangan barber merapikan potongan rambut pelanggan dengan gunting dan sisir"
			fetchpriority="high"
		/>
	</figure>
</section>

<section class="board-section" id="harga" aria-labelledby="harga-judul">
	<div class="board-head">
		<h2 id="harga-judul">Daftar harga</h2>
		<p>Setiap reservasi memakai satu slot 45 menit. Bayar di tempat.</p>
	</div>
	<ol class="rows">
		{#each data.services as s (s.id)}
			<li>
				<a class="row" href={`/reservasi?layanan=${s.id}`}>
					<span class="line">
						<span class="name">{s.name}</span>
						<span class="leader" aria-hidden="true"></span>
						<span class="price">{rupiah(s.price_idr)}</span>
					</span>
					<span class="meta">
						<span><span class="dur">{s.duration_min} menit</span> {SERVICE_NOTES[s.id] ?? ''}</span>
						<span class="pick">Pilih jam<span class="visually-hidden">{` untuk ${s.name}`}</span></span>
					</span>
				</a>
			</li>
		{/each}
	</ol>
</section>

<section class="info" id="lokasi" aria-label="Jam buka dan lokasi">
	<figure class="detail-photo">
		<img
			src="/foto/detail-alat.webp"
			width="900"
			height="1125"
			alt="Gunting dan pisau cukur barber tersusun di atas meja kayu"
			loading="lazy"
			decoding="async"
		/>
	</figure>
	<div class="info-text">
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
			<p class="addr">{SHOP.address}</p>
			<p class="small">Satu kursi, satu barber. Datang lima menit sebelum jam reservasi.</p>
			<a class="btn ghost" href="/reservasi">Lihat jam kosong</a>
		</div>
	</div>
</section>

<style>
	/* ── Hero: teks di kiri, foto menempel ke tepi kanan layar ── */
	.hero {
		display: grid;
		border-bottom: 1px solid var(--rule);
	}
	.hero-text {
		display: flex;
		flex-direction: column;
		padding: clamp(1.5rem, 4vw, 3rem) var(--gutter) 2rem;
		gap: 1rem;
	}
	.where {
		font-weight: 600;
		color: var(--ink-soft);
	}
	h1 {
		font-size: clamp(5rem, 24vw, 15rem);
		line-height: 0.82;
		letter-spacing: -0.015em;
		text-transform: uppercase;
	}
	.hero-foot {
		display: grid;
		grid-template-columns: auto auto;
		align-items: center;
		justify-content: start;
		gap: 1rem 1.5rem;
		margin-top: 0.75rem;
	}
	.from {
		grid-column: 1 / -1;
		font-family: var(--display);
		font-size: clamp(1.7rem, 4vw, 2.4rem);
		font-weight: 500;
		line-height: 1;
	}
	.from strong {
		font-weight: 700;
		color: var(--brick);
	}
	.btn.big {
		min-width: 11rem;
		min-height: 3.5rem;
		font-size: 1.55rem;
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
		height: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		object-position: 55% 40%;
	}

	/* ── Papan harga selebar layar ── */
	.board-section {
		padding: clamp(2.5rem, 6vw, 5rem) var(--gutter);
	}
	.board-section {
		background: var(--ink);
		color: var(--paper);
	}
	.board-section .meta,
	.board-section .board-head p {
		color: #cfc4b2;
	}
	.board-section .dur {
		color: var(--paper);
	}
	.board-section .leader {
		border-bottom-color: var(--brass);
	}
	.board-section .price {
		color: var(--brass-soft);
	}
	.board-section .pick {
		color: var(--brass-soft);
	}
	.board-section .rows li {
		border-bottom-color: #3a312a;
	}
	.board-section .row:hover {
		background: #211b16;
	}
	.board-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem 2rem;
		padding-bottom: 1rem;
		border-bottom: 4px double var(--brass);
	}
	.board-head h2 {
		font-size: clamp(2.5rem, 8vw, 5.5rem);
		text-transform: uppercase;
	}
	.board-head p {
		color: var(--ink-soft);
		max-width: 32ch;
	}
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.rows li {
		border-bottom: 1px solid color-mix(in srgb, var(--rule) 30%, transparent);
	}
	.row {
		display: block;
		padding-block: clamp(1rem, 2.5vw, 1.75rem);
		text-decoration: none;
		transition: background-color 0.15s;
	}
	.row:hover {
		background: var(--card);
	}
	.line {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}
	.name,
	.price {
		font-family: var(--display);
		font-size: clamp(2rem, 6.5vw, 4.25rem);
		line-height: 1;
	}
	.name {
		font-weight: 600;
	}
	.price {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.leader {
		flex: 1;
		min-width: 1rem;
		border-bottom: 2px dotted var(--ink-soft);
		transform: translateY(-0.45rem);
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem 1.5rem;
		margin-top: 0.5rem;
		color: var(--ink-soft);
	}
	.meta > span:first-child {
		max-width: 56ch;
	}
	.dur {
		font-weight: 700;
		color: var(--ink);
		margin-right: 0.35rem;
	}
	.pick {
		font-weight: 700;
		color: var(--brick);
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	/* ── Lokasi: foto penuh di kiri, info di kanan ── */
	.info {
		display: grid;
		background: var(--paper-deep);
		border-top: 1px solid var(--rule);
	}
	.detail-photo {
		margin: 0;
	}
	.detail-photo img {
		width: 100%;
		height: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		object-position: 50% 15%;
	}
	.info-text {
		display: grid;
		gap: 2.5rem;
		padding: clamp(2rem, 5vw, 4rem) var(--gutter);
		align-content: center;
	}
	.info h2 {
		font-size: clamp(2rem, 4vw, 2.75rem);
		text-transform: uppercase;
		margin-bottom: 0.75rem;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		max-width: 26rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.55rem 0;
		border-bottom: 1px solid color-mix(in srgb, var(--rule) 30%, transparent);
	}
	th {
		font-weight: 600;
		padding-right: 1rem;
	}
	.addr {
		font-size: 1.1rem;
		max-width: 30ch;
	}
	.small {
		margin-top: 0.75rem;
		font-size: 0.95rem;
		color: var(--ink-soft);
		max-width: 46ch;
	}
	.info .btn {
		margin-top: 1.25rem;
	}

	@media (min-width: 60rem) {
		.hero {
			grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
			min-height: calc(100svh - 3.75rem);
		}
		.hero-text {
			justify-content: space-between;
			padding-bottom: clamp(2rem, 4vw, 3.5rem);
		}
		/* Lebar kolom teks ±52vw: judul dibatasi agar "BARBER" tidak masuk ke foto. */
		h1 {
			font-size: min(17rem, 15.5vw);
		}
		.hero-photo img {
			aspect-ratio: auto;
			min-height: 100%;
		}
		.info {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
		}
		.detail-photo img {
			aspect-ratio: auto;
			min-height: 34rem;
		}
		.info-text {
			grid-template-columns: 1fr 1fr;
			gap: 3rem;
		}
	}
</style>
