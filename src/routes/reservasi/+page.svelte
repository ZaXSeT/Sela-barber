<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, refreshAll } from '$app/navigation';
	import { tick, untrack } from 'svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { SERVICE_NOTES, SHOP } from '#lib/catalog.ts';
	import {
		dayOfMonth,
		dayShort,
		displayTime,
		longDate,
		monthName,
		rupiah,
		shortDate
	} from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Booking = { code: string; serviceName: string; priceIdr: number; date: string; time: string };
	type Taken = { date: string; time: string; alternatives: { date: string; time: string }[] };

	// Pilihan pengunjung. Nilai awal dari URL atau dari isian yang dikembalikan server.
	const initial = untrack(() => ({ ...form?.values, fromUrl: data.serviceId }));
	let serviceId = $state(initial.serviceId || initial.fromUrl || '');
	let time = $state(initial.time ?? '');
	let name = $state(initial.name ?? '');
	let contact = $state(initial.contact ?? '');
	let submitting = $state(false);

	// Status hasil kirim: dari server (tanpa JS) atau dari enhance (dengan JS).
	let errors = $derived<Record<string, string>>(form?.errors ?? {});
	let message = $derived(form?.message ?? '');
	let taken = $derived<Taken | null>(form?.taken ?? null);
	let booking = $derived<Booking | null>(form?.booking ?? null);

	const service = $derived(data.services.find((s) => s.id === serviceId));
	const day = $derived(data.days.find((d) => d.date === data.date));
	const freeSlots = $derived(data.slots.filter((s) => s.status === 'tersedia'));
	const timeOk = $derived(freeSlots.some((s) => s.time === time));
	const nextOpen = $derived(data.days.find((d) => d.date > data.date && d.status === 'buka'));

	let resultHeading: HTMLElement | undefined = $state();
	let strip: HTMLElement | undefined = $state();

	function dateHref(date: string) {
		return `?${serviceId ? `layanan=${encodeURIComponent(serviceId)}&` : ''}tanggal=${date}`;
	}

	function dayLabel(d: (typeof data.days)[number]) {
		if (d.status === 'tutup') return 'Tutup';
		if (d.status === 'penuh') return 'Penuh';
		if (d.status === 'selesai') return 'Selesai';
		return `${d.free} kosong`;
	}

	async function pickAlternative(alt: { date: string; time: string }) {
		taken = null;
		if (alt.date !== data.date) {
			await goto(dateHref(alt.date), { reset: false, replace: true });
		}
		time = alt.time;
		await tick();
		document.getElementById(`jam-${alt.time}`)?.focus();
	}

	function fillExample() {
		name = 'Raka';
		contact = '0812 0000 0101';
	}

	function resetAfterSuccess() {
		booking = null;
		time = '';
	}

	// Saat tanggal berganti, jam yang dipilih sebelumnya tidak lagi berlaku.
	let lastDate = untrack(() => data.date);
	$effect(() => {
		if (data.date !== lastDate) {
			lastDate = data.date;
			if (!timeOk) time = '';
		}
	});

	// Gulir strip tanggal agar tanggal terpilih terlihat, tanpa menggulir halaman.
	$effect(() => {
		const el = strip?.querySelector<HTMLElement>('[aria-current="date"]');
		if (strip && el) {
			const delta = el.getBoundingClientRect().left - strip.getBoundingClientRect().left;
			strip.scrollLeft += delta - (strip.clientWidth - el.clientWidth) / 2;
		}
	});
</script>

<Seo
	title="Pilih jam · Sela Barber"
	description="Pilih layanan, tanggal, dan jam WIB yang masih kosong di Sela Barber. Proyek konsep dengan data contoh."
/>

<div class="page" class:has-bar={!booking && (service || time)}>
	{#if booking}
		<section class="wrap result" aria-labelledby="hasil-judul">
			<div class="ticket">
				<p class="ticket-top">Kartu janji · {SHOP.name}</p>
				<h1 id="hasil-judul" tabindex="-1" bind:this={resultHeading}>Reservasi tersimpan</h1>
				<p class="ticket-date">{longDate(booking.date)}</p>
				<p class="ticket-time">{displayTime(booking.time)} <span>WIB</span></p>
				<dl>
					<div><dt>Layanan</dt><dd>{booking.serviceName}</dd></div>
					<div><dt>Harga</dt><dd>{rupiah(booking.priceIdr)}, bayar di tempat</dd></div>
					<div><dt>Kode reservasi</dt><dd class="code">{booking.code}</dd></div>
					<div><dt>Alamat</dt><dd>{SHOP.address}</dd></div>
				</dl>
				<p class="ticket-note">
					Simpan kode ini. Jam {displayTime(booking.time)} sekarang tertutup untuk pelanggan lain.
				</p>
			</div>
			<a class="btn ghost" href={`/reservasi?tanggal=${booking.date}`} onclick={resetAfterSuccess}
				>Kembali ke jadwal</a
			>
		</section>
	{:else}
		<div class="wrap intro">
			<h1>Pilih jam</h1>
			<p>Pilih layanan, tanggal, lalu jam yang masih kosong. Semua jam dalam WIB.</p>
		</div>

		<form
			method="POST"
			class="wrap layout"
			novalidate
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					submitting = false;
					await update({ reset: false });
					// Gagal karena bentrok atau validasi: muat ulang ketersediaan agar jam terisi ikut tertutup.
					if (result.type === 'failure') await refreshAll();
					await tick();
					if (result.type === 'success') {
						window.scrollTo({ top: 0 });
						resultHeading?.focus();
					} else {
						const target =
							document.getElementById('jam-bentrok') ??
							document.querySelector<HTMLElement>('[aria-invalid="true"], .field-error') ??
							document.getElementById('status-kirim');
						target?.focus();
					}
				};
			}}
		>
			<input type="hidden" name="date" value={data.date} />

			<!-- 1. Layanan: papan harga yang bisa dipilih -->
			<fieldset class="services" aria-describedby={errors.serviceId ? 'err-layanan' : undefined}>
				<legend><span class="step">1</span> Layanan</legend>
				{#if errors.serviceId}<p class="field-error" tabindex="-1" id="err-layanan">{errors.serviceId}</p>{/if}
				{#each data.services as s (s.id)}
					<label class="service" class:selected={serviceId === s.id}>
						<input
							type="radio"
							name="serviceId"
							value={s.id}
							bind:group={serviceId}
						/>
						<span class="s-line">
							<span class="s-name">{s.name}</span>
							<span class="leader" aria-hidden="true"></span>
							<span class="s-price">{rupiah(s.price_idr)}</span>
						</span>
						<span class="s-meta">{s.duration_min} menit · {SERVICE_NOTES[s.id] ?? ''}</span>
					</label>
				{/each}
			</fieldset>

			<div class="schedule">
				<!-- 2. Tanggal -->
				<section aria-labelledby="judul-tanggal">
					<h2 id="judul-tanggal"><span class="step">2</span> Tanggal</h2>
					{#if errors.date}<p class="field-error" tabindex="-1" id="err-tanggal">{errors.date}</p>{/if}
					<ol class="dates" bind:this={strip}>
						{#each data.days as d (d.date)}
							<li>
								{#if d.status === 'tutup' || d.status === 'selesai'}
									<span class="date closed">
										<span class="visually-hidden">{`${longDate(d.date)}: `}</span>
										<span class="dw" aria-hidden="true">{dayShort(d.date)}</span>
										<span class="dn" aria-hidden="true">{dayOfMonth(d.date)}</span>
										<span class="ds"
											>{d.status === 'tutup' ? 'Tutup' : 'Selesai'}<span class="visually-hidden"
												>, tidak bisa dipilih</span
											></span
										>
									</span>
								{:else}
									<a
										class="date"
										class:full={d.status === 'penuh'}
										href={dateHref(d.date)}
										data-sveltekit-reset="false"
										data-sveltekit-replacestate
										aria-current={d.date === data.date ? 'date' : undefined}
										aria-label={`${longDate(d.date)}, ${d.status === 'penuh' ? 'penuh' : `${d.free} jam kosong`}`}
									>
										<span class="dw">{dayShort(d.date)}</span>
										<span class="dn">{dayOfMonth(d.date)}</span>
										<span class="ds">{dayLabel(d)}</span>
									</a>
								{/if}
							</li>
						{/each}
					</ol>
				</section>

				<!-- 3. Jam -->
				<fieldset class="times" aria-describedby="slot-info{errors.time ? ' err-jam' : ''}">
					<legend><span class="step">3</span> Jam · {longDate(data.date)}</legend>
					<p class="slot-info" id="slot-info">
						Satu slot disediakan selama 45 menit, cukup untuk layanan terpanjang.
					</p>

					{#if taken}
						<div class="notice warn" id="jam-bentrok" tabindex="-1" role="alert">
							<p>
								<strong>Jam {displayTime(taken.time)} baru saja dipesan pelanggan lain.</strong>
								Nama dan nomor Anda tetap terisi. Pilih jam lain:
							</p>
							{#if taken.alternatives.length}
								<div class="alts">
									{#each taken.alternatives as alt (alt.date + alt.time)}
										<button type="button" class="alt" onclick={() => pickAlternative(alt)}>
											{alt.date === taken.date ? '' : `${shortDate(alt.date)}, `}{displayTime(alt.time)}
										</button>
									{/each}
								</div>
							{:else}
								<p>Belum ada jam kosong dalam 30 hari ke depan.</p>
							{/if}
						</div>
					{/if}

					{#if errors.time}<p class="field-error" tabindex="-1" id="err-jam">{errors.time}</p>{/if}

					{#if day?.status === 'penuh'}
						<div class="notice">
							<p>
								<strong>Jadwal {dayShort(data.date)}, {dayOfMonth(data.date)} {monthName(data.date)} penuh.</strong>
								{#if nextOpen}
									Jam kosong berikutnya ada di {longDate(nextOpen.date)}.
								{/if}
							</p>
							{#if nextOpen}
								<a
									class="btn ghost small"
									href={dateHref(nextOpen.date)}
									data-sveltekit-reset="false"
									data-sveltekit-replacestate>Lihat {shortDate(nextOpen.date)}</a
								>
							{/if}
						</div>
					{/if}

					<div class="grid" role="presentation">
						{#each data.slots as s (s.time)}
							<label class="slot {s.status}" class:selected={time === s.time}>
								<input
									type="radio"
									name="time"
									id={`jam-${s.time}`}
									value={s.time}
									bind:group={time}
									disabled={s.status !== 'tersedia'}
								/>
								<span class="t">{displayTime(s.time)}</span>
								<span class="st"
									>{s.status === 'tersedia' ? 'Kosong' : s.status === 'terisi' ? 'Terisi' : 'Lewat'}</span
								>
							</label>
						{/each}
					</div>
				</fieldset>

				<!-- 4. Data diri dan ringkasan -->
				<section class="details" id="data-diri" aria-labelledby="judul-data">
					<h2 id="judul-data"><span class="step">4</span> Data diri</h2>
					<p class="demo-flag">
						Proyek konsep · gunakan data contoh.
						<button type="button" class="linkish" onclick={fillExample}>Isi contoh</button>
					</p>

					<div class="who">
					<div class="field">
						<label for="name">Nama panggilan</label>
						<input
							id="name"
							name="name"
							type="text"
							autocomplete="nickname"
							maxlength="40"
							bind:value={name}
							aria-invalid={errors.name ? 'true' : undefined}
							aria-describedby={errors.name ? 'err-nama' : undefined}
						/>
						{#if errors.name}<p class="field-error" tabindex="-1" id="err-nama">{errors.name}</p>{/if}
					</div>
					<div class="field">
						<label for="contact">Nomor WhatsApp</label>
						<input
							id="contact"
							name="contact"
							type="tel"
							inputmode="tel"
							autocomplete="tel"
							maxlength="24"
							placeholder="0812 3456 7890"
							bind:value={contact}
							aria-invalid={errors.contact ? 'true' : undefined}
							aria-describedby="hint-kontak{errors.contact ? ' err-kontak' : ''}"
						/>
						<p class="hint" id="hint-kontak">Dipakai barber untuk mengabari bila ada perubahan.</p>
						{#if errors.contact}<p class="field-error" tabindex="-1" id="err-kontak">{errors.contact}</p>{/if}
					</div>
					</div>

					<div class="check">
					<div class="summary" aria-live="polite">
						<h3>Ringkasan</h3>
						<dl>
							<div><dt>Layanan</dt><dd>{service ? service.name : 'Belum dipilih'}</dd></div>
							<div><dt>Harga</dt><dd>{service ? rupiah(service.price_idr) : '–'}</dd></div>
							<div><dt>Tanggal</dt><dd>{longDate(data.date)}</dd></div>
							<div>
								<dt>Jam</dt>
								<dd>{timeOk ? `${displayTime(time)} WIB` : 'Belum dipilih'}</dd>
							</div>
						</dl>
					</div>

					{#if message}
						<p class="notice warn" id="status-kirim" tabindex="-1" role="alert">{message}</p>
					{/if}

					<button class="btn confirm" type="submit" disabled={submitting}>
						{submitting ? 'Menyimpan reservasi…' : 'Konfirmasi reservasi'}
					</button>
					<p class="hint">Bayar di tempat setelah dicukur. Tidak ada pembayaran online.</p>
					</div>
				</section>
			</div>
		</form>

		{#if service || time}
			<div class="mobile-bar" aria-hidden="true">
				<p>
					<strong>{service?.name ?? 'Pilih layanan'}</strong>
					<span>{shortDate(data.date)}{timeOk ? `, ${displayTime(time)}` : ''}{service ? ` · ${rupiah(service.price_idr)}` : ''}</span>
				</p>
				<a href="#data-diri" tabindex="-1">Isi data</a>
			</div>
		{/if}
	{/if}
</div>

<style>
	.page {
		padding-bottom: 3rem;
	}
	.page.has-bar {
		padding-bottom: 6rem;
	}
	.intro {
		padding-block: 1.75rem 1.25rem;
	}
	.intro h1 {
		font-size: clamp(3rem, 12vw, 5rem);
		text-transform: uppercase;
	}
	.intro p {
		margin-top: 0.5rem;
		color: var(--ink-soft);
		max-width: 52ch;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
	}
	legend {
		float: left;
		width: 100%;
	}
	legend + * {
		clear: both;
	}
	legend,
	h2 {
		font-family: var(--display);
		font-weight: 700;
		font-size: 1.75rem;
		line-height: 1.1;
		padding: 0;
		margin-bottom: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.step {
		display: inline-grid;
		place-items: center;
		width: 1.9rem;
		height: 1.9rem;
		border: 1.5px solid var(--ink);
		border-radius: 50%;
		font-size: 1.15rem;
		flex: none;
	}

	/* Papan layanan */
	.services {
		background: var(--card);
		border-block: 4px double var(--rule);
		padding: 1rem clamp(0.9rem, 3vw, 1.5rem) 0.5rem;
		align-self: start;
	}
	.service {
		position: relative;
		display: block;
		padding: 0.85rem 0.75rem 0.85rem 2.4rem;
		margin-inline: -0.75rem;
		border-bottom: 1px solid color-mix(in srgb, var(--rule) 30%, transparent);
		cursor: pointer;
	}
	.service:last-of-type {
		border-bottom: 0;
	}
	.service input {
		position: absolute;
		left: 0.75rem;
		top: 1.2rem;
		width: 1.15rem;
		height: 1.15rem;
		accent-color: var(--brick);
	}
	.service.selected {
		background: color-mix(in srgb, var(--brick) 9%, transparent);
	}
	.s-line {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.s-name,
	.s-price {
		font-family: var(--display);
		font-weight: 600;
		font-size: 1.65rem;
		line-height: 1.1;
	}
	.s-price {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.leader {
		flex: 1;
		min-width: 0.75rem;
		border-bottom: 2px dotted var(--ink-soft);
		transform: translateY(-0.3rem);
	}
	.s-meta {
		display: block;
		margin-top: 0.2rem;
		font-size: 0.9rem;
		color: var(--ink-soft);
	}

	/* Tanggal */
	.schedule {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
		min-width: 0;
	}
	.dates {
		list-style: none;
		margin: 0 calc(var(--gutter) * -1);
		padding: 0.25rem var(--gutter) 0.75rem;
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		scroll-snap-type: x proximity;
		scrollbar-width: thin;
	}
	.dates li {
		scroll-snap-align: center;
	}
	.date {
		position: relative;
		display: grid;
		justify-items: center;
		width: 4.6rem;
		padding: 0.5rem 0.25rem;
		border: 1px solid var(--ink);
		border-radius: 2px;
		text-decoration: none;
		background: var(--card);
	}
	.dw {
		font-size: 0.85rem;
		font-weight: 600;
	}
	.dn {
		font-family: var(--display);
		font-size: 1.9rem;
		font-weight: 700;
		line-height: 1;
	}
	.ds {
		font-size: 0.75rem;
		color: var(--ink-soft);
		white-space: nowrap;
	}
	.date.closed {
		border-style: dashed;
		color: var(--ink-soft);
		background: transparent;
	}
	.date.full .ds {
		color: var(--brick);
		font-weight: 600;
	}
	.date[aria-current='date'] {
		background: var(--ink);
		color: var(--paper);
	}
	.date[aria-current='date'] .ds {
		color: var(--paper);
	}

	/* Jam */
	.slot-info {
		color: var(--ink-soft);
		margin-bottom: 1rem;
		font-size: 0.95rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.5rem;
	}
	.slot {
		position: relative;
		display: grid;
		justify-items: center;
		padding: 0.6rem 0.25rem;
		border: 1px solid var(--ink);
		border-radius: 2px;
		background: var(--card);
		cursor: pointer;
	}
	.slot input {
		position: absolute;
		inset: 0;
		opacity: 0;
		margin: 0;
		cursor: inherit;
	}
	.slot:has(input:focus-visible) {
		outline: 3px solid var(--focus);
		outline-offset: 2px;
	}
	.slot .t {
		font-family: var(--display);
		font-size: 1.7rem;
		font-weight: 700;
		line-height: 1.05;
		font-variant-numeric: tabular-nums;
	}
	.slot .st {
		font-size: 0.8rem;
	}
	.slot.selected {
		background: var(--brick);
		border-color: var(--brick);
		color: #fff;
	}
	.slot.terisi,
	.slot.lewat {
		cursor: not-allowed;
		background: transparent;
		border-style: dashed;
		color: var(--ink-soft);
	}
	.slot.terisi .t {
		text-decoration: line-through;
		text-decoration-thickness: 2px;
	}

	/* Pesan */
	.notice {
		border-left: 4px solid var(--ink);
		background: var(--card);
		padding: 0.85rem 1rem;
		margin-bottom: 1rem;
		display: grid;
		gap: 0.75rem;
		justify-items: start;
	}
	.notice.warn {
		border-left-color: var(--brick);
	}
	.alts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.alt {
		font: 600 1.25rem var(--display);
		padding: 0.4rem 0.9rem;
		min-height: 2.75rem;
		border: 1.5px solid var(--brick);
		background: transparent;
		color: var(--brick);
		border-radius: 2px;
		cursor: pointer;
	}
	.alt:hover {
		background: var(--brick);
		color: #fff;
	}
	.field-error {
		color: var(--brick-deep);
		font-weight: 600;
		font-size: 0.95rem;
		margin: 0.35rem 0 0.75rem;
	}
	.field-error::before {
		content: '⚠ ';
	}

	/* Data diri */
	.demo-flag {
		font-size: 0.9rem;
		background: var(--paper-deep);
		padding: 0.5rem 0.75rem;
		margin-bottom: 1rem;
	}
	.linkish {
		background: none;
		border: 0;
		padding: 0.25rem;
		font: inherit;
		font-weight: 700;
		color: var(--brick);
		text-decoration: underline;
		cursor: pointer;
	}
	.field {
		margin-bottom: 1rem;
	}
	.field label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.3rem;
	}
	.field input {
		width: 100%;
		max-width: 24rem;
		min-height: 3rem;
		padding: 0.6rem 0.75rem;
		border: 1.5px solid var(--ink);
		border-radius: 2px;
		background: #fffdf8;
		font: inherit;
		font-size: 1.05rem;
		color: var(--ink);
	}
	.field input[aria-invalid='true'] {
		border-color: var(--brick);
		border-width: 2px;
	}
	.hint {
		font-size: 0.85rem;
		color: var(--ink-soft);
		margin-top: 0.3rem;
	}
	.summary {
		border-top: 1px solid var(--rule);
		border-bottom: 1px solid var(--rule);
		padding-block: 0.75rem;
		margin-block: 1.25rem;
	}
	.summary h3 {
		font-size: 1.35rem;
		margin-bottom: 0.4rem;
	}
	dl {
		margin: 0;
		display: grid;
		gap: 0.25rem;
	}
	dl div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}
	dt {
		color: var(--ink-soft);
	}
	dd {
		margin: 0;
		font-weight: 600;
		text-align: right;
	}
	.confirm {
		width: 100%;
		max-width: 24rem;
		font-size: 1.5rem;
	}

	/* Bilah ringkas di HP */
	.mobile-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.65rem var(--gutter) calc(0.65rem + env(safe-area-inset-bottom));
		background: var(--ink);
		color: var(--paper);
	}
	.mobile-bar p {
		display: grid;
		line-height: 1.25;
		min-width: 0;
	}
	.mobile-bar strong {
		font-family: var(--display);
		font-size: 1.3rem;
	}
	.mobile-bar span {
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.mobile-bar a {
		flex: none;
		font-weight: 700;
		color: var(--paper);
		padding: 0.5rem 0.75rem;
		border: 1.5px solid var(--paper);
		border-radius: 2px;
		text-decoration: none;
	}

	/* Kartu janji */
	.result {
		padding-block: 2rem 1rem;
		display: grid;
		gap: 1.5rem;
		justify-items: start;
	}
	.ticket {
		width: 100%;
		max-width: 34rem;
		background: var(--card);
		border: 1px solid var(--ink);
		outline: 1px solid var(--ink);
		outline-offset: -7px;
		padding: 1.75rem clamp(1.25rem, 5vw, 2.25rem);
	}
	.ticket-top {
		font-size: 0.9rem;
		color: var(--ink-soft);
	}
	.ticket h1 {
		font-size: 2rem;
		margin-top: 0.25rem;
		color: var(--brick);
	}
	.ticket h1:focus {
		outline: none;
	}
	.ticket-date {
		margin-top: 1.25rem;
		font-family: var(--display);
		font-size: clamp(1.75rem, 7vw, 2.4rem);
		font-weight: 600;
		line-height: 1.1;
	}
	.ticket-time {
		font-family: var(--display);
		font-weight: 700;
		font-size: clamp(5rem, 24vw, 7.5rem);
		line-height: 0.9;
		font-variant-numeric: tabular-nums;
	}
	.ticket-time span {
		font-size: 0.3em;
		font-weight: 600;
	}
	.ticket dl {
		margin-top: 1.25rem;
		padding-top: 0.85rem;
		border-top: 2px dotted var(--ink-soft);
	}
	.code {
		font-family: var(--display);
		font-size: 1.4rem;
		letter-spacing: 0.06em;
	}
	.ticket-note {
		margin-top: 1rem;
		font-size: 0.95rem;
		color: var(--ink-soft);
	}

	@media (min-width: 40rem) {
		.grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
	@media (min-width: 60rem) {
		.layout {
			grid-template-columns: minmax(19rem, 25rem) minmax(0, 1fr);
			gap: 2.5rem;
			align-items: start;
		}
		.services {
			position: sticky;
			top: 1rem;
		}
		.dates {
			margin-inline: 0;
			padding-inline: 0;
		}
		.mobile-bar {
			display: none;
		}
		.page.has-bar {
			padding-bottom: 3rem;
		}
	}
	@media (min-width: 80rem) {
		/* Isian di kiri, ringkasan + tombol di kanan: tidak ada ruang kosong di layar lebar. */
		.details {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			column-gap: 3rem;
			align-items: start;
		}
		.details > h2,
		.details > .demo-flag {
			grid-column: 1 / -1;
		}
		.check .summary {
			margin-top: 0;
		}
		.who .field input,
		.check .confirm {
			max-width: none;
		}
		.layout {
			grid-template-columns: minmax(22rem, 28rem) minmax(0, 1fr);
			gap: 3.5rem;
		}
		.grid {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
		.intro h1 {
			font-size: 6.5rem;
		}
	}
</style>
