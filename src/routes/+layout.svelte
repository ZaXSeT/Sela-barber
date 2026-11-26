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
	<meta name="theme-color" content="#1c1916" />
</svelte:head>

<a class="skip" href="#isi">Langsung ke isi</a>

<header class="site">
	<a class="mark" href="/" aria-label="Sela Barber, beranda">
		<svg viewBox="0 0 20 32" aria-hidden="true"><rect x="2" y="1" width="16" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="2" /><path d="M2 9 18 3M2 17 18 11M2 25 18 19" stroke="var(--brick)" stroke-width="3" /></svg>
		<span>Sela Barber</span>
	</a>
	<nav aria-label="Utama">
		<a href="/#harga">Harga</a>
		<a href="/#lokasi">Lokasi</a>
		<a class="book" href="/reservasi" aria-current={onReservasi ? 'page' : undefined}>Pilih jam</a>
	</nav>
</header>

<main id="isi">
	{@render children()}
</main>

<footer class="site">
	<p class="foot-mark">Sela Barber</p>
	<p>
		Proyek konsep untuk portofolio. Nama usaha, alamat, dan seluruh data di situs ini fiktif.
	</p>
</footer>

<style>
	.skip {
		position: absolute;
		left: 0.5rem;
		top: -3rem;
		background: var(--paper);
		color: var(--ink);
		padding: 0.5rem 0.75rem;
		z-index: 60;
	}
	.skip:focus {
		top: 0.5rem;
	}
	/* Navbar penuh dari tepi ke tepi, menempel di atas saat digulir. */
	header.site {
		border-bottom: 1px solid var(--brass);
		position: sticky;
		top: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
		min-height: 3.75rem;
		padding-inline: var(--gutter);
		background: var(--ink);
		color: var(--paper);
	}
	.mark {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		font-family: var(--display);
		font-weight: 700;
		font-size: 1.55rem;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		text-decoration: none;
	}
	.mark svg {
		width: 0.85rem;
		height: 1.4rem;
	}
	nav {
		display: flex;
		align-items: center;
		gap: clamp(0.75rem, 2.5vw, 2rem);
	}
	nav a {
		font-weight: 600;
		text-decoration: none;
		padding-block: 0.4rem;
		border-bottom: 2px solid transparent;
	}
	nav a:hover {
		border-bottom-color: var(--brass);
		color: var(--brass-soft);
	}
	nav a.book {
		padding: 0.55rem 1rem;
		border: 0;
		background: var(--brick);
		color: #fff;
		font-family: var(--display);
		font-size: 1.15rem;
		letter-spacing: 0.02em;
	}
	nav a.book {
		box-shadow: inset 0 0 0 1px var(--brass);
	}
	nav a.book:hover,
	nav a.book[aria-current='page'] {
		background: var(--brass);
		color: var(--ink);
	}
	footer.site {
		background: var(--ink);
		color: var(--paper-deep);
		padding: 2.5rem var(--gutter) 3rem;
		display: grid;
		gap: 0.5rem;
		font-size: 0.9rem;
	}
	footer.site {
		border-top: 1px solid var(--brass);
	}
	.foot-mark {
		font-family: var(--display);
		font-size: clamp(3rem, 12vw, 9rem);
		font-weight: 700;
		line-height: 0.85;
		text-transform: uppercase;
		color: var(--brass-soft);
	}
	@media (max-width: 30rem) {
		nav a:not(.book) {
			display: none;
		}
	}
</style>
