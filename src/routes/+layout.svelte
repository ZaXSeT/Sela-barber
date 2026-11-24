<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	const onReservasi = $derived(page.url.pathname.startsWith('/reservasi'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<meta name="theme-color" content="#f1eadb" />
</svelte:head>

<a class="skip" href="#isi">Langsung ke isi</a>

<header class="site">
	<div class="wrap bar">
		<a class="mark" href="/" aria-label="Sela Barber, beranda">Sela Barber</a>
		<nav aria-label="Utama">
			<a href="/#harga">Harga</a>
			<a href="/reservasi" aria-current={onReservasi ? 'page' : undefined}>Reservasi</a>
		</nav>
	</div>
</header>

<main id="isi">
	{@render children()}
</main>

<footer class="site">
	<div class="wrap">
		<p>
			Sela Barber adalah proyek konsep untuk portofolio. Nama usaha, alamat, dan seluruh data di situs
			ini fiktif.
		</p>
	</div>
</footer>

<style>
	.skip {
		position: absolute;
		left: 0.5rem;
		top: -3rem;
		background: var(--ink);
		color: var(--paper);
		padding: 0.5rem 0.75rem;
		z-index: 50;
	}
	.skip:focus {
		top: 0.5rem;
	}
	header.site {
		border-bottom: 1px solid var(--rule);
		background: var(--paper);
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 3.75rem;
		gap: 1rem;
	}
	.mark {
		font-family: var(--display);
		font-weight: 700;
		font-size: 1.6rem;
		text-decoration: none;
		letter-spacing: 0.01em;
	}
	nav {
		display: flex;
		gap: 1.25rem;
	}
	nav a {
		font-weight: 600;
		text-decoration: none;
		padding-block: 0.4rem;
		border-bottom: 2px solid transparent;
	}
	nav a:hover,
	nav a[aria-current='page'] {
		border-bottom-color: var(--brick);
	}
	footer.site {
		border-top: 1px solid var(--rule);
		padding-block: 1.75rem 2.5rem;
		color: var(--ink-soft);
		font-size: 0.9rem;
	}
</style>
