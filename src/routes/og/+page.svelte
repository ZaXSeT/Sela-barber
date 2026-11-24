<script lang="ts">
	import { rupiah } from '#lib/schedule.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>

<div class="og">
	<div class="left">
		<p class="name">Sela Barber</p>
		<p class="line">Pilih jam lewat HP. Jam yang sudah dipesan langsung tertutup.</p>
		<ul>
			{#each data.services as s (s.id)}
				<li><span>{s.name}</span><i></i><b>{rupiah(s.price_idr)}</b></li>
			{/each}
		</ul>
	</div>
	<div class="right">
		<img src="/foto/hero-gunting.webp" alt="" width="960" height="1200" />
		<div class="card">
			<small>Rabu, 25 November</small>
			<strong>14.30 <em>WIB</em></strong>
			<small>Potong Rapi · SB-7K3QXA</small>
		</div>
	</div>
</div>

<style>
	:global(header.site),
	:global(footer.site),
	:global(.skip) {
		display: none !important;
	}
	.og {
		width: 1200px;
		height: 630px;
		display: grid;
		grid-template-columns: 1fr 470px;
		background: var(--paper);
		overflow: hidden;
	}
	.left {
		padding: 56px 56px 0 64px;
		border-right: 1px solid var(--rule);
	}
	.name {
		font: 700 112px/0.9 var(--display);
		text-transform: uppercase;
	}
	.line {
		margin-top: 18px;
		font-size: 25px;
		max-width: 30ch;
		color: var(--ink-soft);
	}
	ul {
		list-style: none;
		margin: 30px 0 0;
		padding: 18px 0 0;
		border-top: 4px double var(--rule);
	}
	li {
		display: flex;
		align-items: baseline;
		gap: 12px;
		font: 600 40px/1.35 var(--display);
	}
	li i {
		flex: 1;
		border-bottom: 2px dotted var(--ink-soft);
	}
	li b {
		font-weight: 700;
	}
	.right {
		position: relative;
	}
	.right img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.card {
		position: absolute;
		left: 28px;
		bottom: 28px;
		background: var(--card);
		border: 1px solid var(--ink);
		outline: 1px solid var(--ink);
		outline-offset: -6px;
		padding: 16px 24px;
		display: grid;
	}
	.card small {
		font-size: 17px;
		color: var(--ink-soft);
	}
	.card strong {
		font: 700 74px/1 var(--display);
	}
	.card em {
		font-style: normal;
		font-size: 24px;
	}
</style>
