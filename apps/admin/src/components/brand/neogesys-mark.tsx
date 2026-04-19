/**
 * NEOGESYS · Brand mark — admin twin
 * ─────────────────────────────────────────────────────────────────
 * Copia 1:1 di apps/web/src/components/brand/neogesys-mark.tsx.
 * Duplicato perché apps/admin è un Next app indipendente e non
 * importa da apps/web. Se cambia uno, cambiare anche l'altro —
 * gli id dei <defs> hanno suffisso `-adm` per distinguerli nella
 * stessa pagina (es. export PDF admin+web side-by-side).
 *
 * Source of truth: design-tokens + canonical SVG in /public/brand/.
 */

interface MarkProps {
	className?: string;
	size?: number | string;
	title?: string;
	ariaHidden?: boolean;
}

// ────────────────────────────────────────────────────────────────────
// NeogesysMark — variante completa con quark cyan
// ────────────────────────────────────────────────────────────────────

export function NeogesysMark({
	className,
	size,
	title = "NEOGESYS",
	ariaHidden = false,
}: MarkProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 32 32"
			width={size}
			height={size}
			className={className}
			role="img"
			aria-hidden={ariaHidden || undefined}
			aria-label={ariaHidden ? undefined : title}
		>
			{!ariaHidden ? <title>{title}</title> : null}
			<defs>
				<radialGradient id="quasar-core-nm-adm" cx=".5" cy=".5" r=".5">
					<stop offset="0%" stopColor="#FFF6D9" />
					<stop offset="35%" stopColor="#FFF6D9" stopOpacity=".9" />
					<stop offset="100%" stopColor="#FFF6D9" stopOpacity="0" />
				</radialGradient>
				<linearGradient id="quasar-jet-nm-adm" x1=".5" y1="0" x2=".5" y2="1">
					<stop offset="0%" stopColor="#FFF6D9" stopOpacity="0" />
					<stop offset="50%" stopColor="#FFF6D9" stopOpacity=".9" />
					<stop offset="100%" stopColor="#FFF6D9" />
				</linearGradient>
				<linearGradient id="quasar-disk-nm-adm" x1="0" y1=".5" x2="1" y2=".5">
					<stop offset="0%" stopColor="#8B3FE5" />
					<stop offset="50%" stopColor="#ED3F9E" />
					<stop offset="100%" stopColor="#8B3FE5" />
				</linearGradient>
			</defs>
			<path d="M15.6 15 Q15.9 9 16 2 Q16.1 9 16.4 15 Z" fill="url(#quasar-jet-nm-adm)" />
			<path
				d="M15.6 17 Q15.9 22 16 28 Q16.1 22 16.4 17 Z"
				fill="url(#quasar-jet-nm-adm)"
				opacity=".9"
			/>
			<ellipse
				cx="16"
				cy="16"
				rx="12"
				ry="3.4"
				transform="rotate(-22 16 16)"
				fill="none"
				stroke="url(#quasar-disk-nm-adm)"
				strokeWidth="1.1"
			/>
			<ellipse
				cx="16"
				cy="16"
				rx="8.5"
				ry="2.3"
				transform="rotate(-22 16 16)"
				fill="none"
				stroke="#ED3F9E"
				strokeWidth=".55"
				strokeOpacity=".6"
				strokeDasharray=".7 1.1"
			/>
			<circle cx="16" cy="16" r="3.6" fill="url(#quasar-core-nm-adm)" />
			<circle cx="16" cy="16" r="1.1" fill="#FFF6D9" />
			<circle cx="22.4" cy="19.4" r=".95" fill="#3BD0F2" />
		</svg>
	);
}

// ────────────────────────────────────────────────────────────────────
// NeogesysMarkMinimal — currentColor, no quark
// ────────────────────────────────────────────────────────────────────

export function NeogesysMarkMinimal({
	className,
	size,
	title = "NEOGESYS",
	ariaHidden = false,
}: MarkProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 32 32"
			width={size}
			height={size}
			className={className}
			role="img"
			fill="currentColor"
			aria-hidden={ariaHidden || undefined}
			aria-label={ariaHidden ? undefined : title}
		>
			{!ariaHidden ? <title>{title}</title> : null}
			<defs>
				<radialGradient id="quasar-core-nmm-adm" cx=".5" cy=".5" r=".5">
					<stop offset="0%" stopColor="currentColor" />
					<stop offset="35%" stopColor="currentColor" stopOpacity=".9" />
					<stop offset="100%" stopColor="currentColor" stopOpacity="0" />
				</radialGradient>
				<linearGradient id="quasar-jet-nmm-adm" x1=".5" y1="0" x2=".5" y2="1">
					<stop offset="0%" stopColor="currentColor" stopOpacity="0" />
					<stop offset="50%" stopColor="currentColor" stopOpacity=".9" />
					<stop offset="100%" stopColor="currentColor" />
				</linearGradient>
			</defs>
			<path d="M15.6 15 Q15.9 9 16 2 Q16.1 9 16.4 15 Z" fill="url(#quasar-jet-nmm-adm)" />
			<path
				d="M15.6 17 Q15.9 22 16 28 Q16.1 22 16.4 17 Z"
				fill="url(#quasar-jet-nmm-adm)"
				opacity=".9"
			/>
			<ellipse
				cx="16"
				cy="16"
				rx="12"
				ry="3.4"
				transform="rotate(-22 16 16)"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.1"
			/>
			<ellipse
				cx="16"
				cy="16"
				rx="8.5"
				ry="2.3"
				transform="rotate(-22 16 16)"
				fill="none"
				stroke="currentColor"
				strokeWidth=".5"
				strokeOpacity=".55"
				strokeDasharray=".7 1.1"
			/>
			<circle cx="16" cy="16" r="3.6" fill="url(#quasar-core-nmm-adm)" />
			<circle cx="16" cy="16" r="1.1" fill="currentColor" />
		</svg>
	);
}

// Wordmark glyph paths (NEOGESYS) — see web twin for source.
const WORDMARK_PATHS = (
	<>
		<path d="M9.45 0L2.92 0L2.92-25.87L9.97-25.87L18.56-10.87L18.56-25.87L25.08-25.87L25.08 0L18.07 0L9.45-15.00L9.45 0Z" />
		<path d="M51.29 0L33.18 0L33.18-25.87L51.29-25.87L51.29-19.98L39.71-19.98L39.71-16.12L50.17-16.12L50.17-10.24L39.71-10.24L39.71-5.89L51.29-5.89L51.29 0Z" />
		<path d="M57.96-6.60L57.96-6.60L57.96-19.27Q57.96-25.87 64.56-25.87L64.56-25.87L72.96-25.87Q79.56-25.87 79.56-19.27L79.56-19.27L79.56-6.60Q79.56 0 72.96 0L72.96 0L64.56 0Q57.96 0 57.96-6.60ZM64.49-19.57L64.49-6.30Q64.49-5.89 64.90-5.89L64.90-5.89L72.62-5.89Q73.04-5.89 73.04-6.30L73.04-6.30L73.04-19.57Q73.04-19.98 72.62-19.98L72.62-19.98L64.90-19.98Q64.49-19.98 64.49-19.57L64.49-19.57Z" />
		<path d="M86.91-6.60L86.91-6.60L86.91-19.27Q86.91-25.87 93.51-25.87L93.51-25.87L104.08-25.87L107.01-23.62L107.01-19.98L93.85-19.98Q93.43-19.98 93.43-19.57L93.43-19.57L93.43-6.30Q93.43-5.89 93.85-5.89L93.85-5.89L101.23-5.89L101.23-10.24L97.00-10.24L97.00-16.12L107.76-16.12L107.76 0L93.51 0Q86.91 0 86.91-6.60Z" />
		<path d="M133.21 0L115.10 0L115.10-25.87L133.21-25.87L133.21-19.98L121.63-19.98L121.63-16.12L132.09-16.12L132.09-10.24L121.63-10.24L121.63-5.89L133.21-5.89L133.21 0Z" />
		<path d="M142.06 0L139.14-2.25L139.14-5.89L150.80-5.89Q151.21-5.89 151.21-6.30L151.21-6.30L151.21-8.85Q151.21-9.37 150.76-9.45L150.76-9.45L143.82-10.87Q139.14-11.77 139.14-17.13L139.14-17.13L139.14-19.27Q139.14-25.87 145.74-25.87L145.74-25.87L154.06-25.87L156.98-23.62L156.98-19.98L146.07-19.98Q145.66-19.98 145.66-19.57L145.66-19.57L145.66-17.17Q145.66-16.68 146.11-16.57L146.11-16.57L153.05-15.22Q157.73-14.25 157.73-8.92L157.73-8.92L157.73-6.60Q157.73 0 151.14 0L151.14 0L142.06 0Z" />
		<path d="M170.41-8.92L162.42-24.67L163.17-25.87L168.76-25.87L173.67-15.93L178.58-25.87L184.17-25.87L184.92-24.67L176.93-8.92L176.93 0L170.41 0L170.41-8.92Z" />
		<path d="M192.53 0L189.60-2.25L189.60-5.89L201.26-5.89Q201.68-5.89 201.68-6.30L201.68-6.30L201.68-8.85Q201.68-9.37 201.23-9.45L201.23-9.45L194.29-10.87Q189.60-11.77 189.60-17.13L189.60-17.13L189.60-19.27Q189.60-25.87 196.20-25.87L196.20-25.87L204.53-25.87L207.45-23.62L207.45-19.98L196.54-19.98Q196.13-19.98 196.13-19.57L196.13-19.57L196.13-17.17Q196.13-16.68 196.58-16.57L196.58-16.57L203.51-15.22Q208.20-14.25 208.20-8.92L208.20-8.92L208.20-6.60Q208.20 0 201.60 0L201.60 0L192.53 0Z" />
	</>
);

const TAGLINE_PATHS = (
	<>
		<path d="M1.48-3.06L1.48-3.06L1.48-12.94L3.77-12.94L3.77-2.89Q3.77-2.08 4.59-2.08L4.59-2.08L8.40-2.08Q9.22-2.08 9.22-2.89L9.22-2.89L9.22-12.94L11.51-12.94L11.51-3.06Q11.51 0 8.45 0L8.45 0L4.54 0Q1.48 0 1.48-3.06Z" />
		<path d="M20.63 0L18.34 0L18.34-12.94L20.83-12.94L26.57-3.71L26.57-12.94L28.86-12.94L28.86 0L26.38 0L20.63-9.22L20.63 0Z" />
		<path d="M38.09 0L35.80 0L35.80-12.94L38.09-12.94L38.09 0Z" />
		<path d="M47.60 0L43.79-12.49L44.09-12.94L46.08-12.94L49.28-2.08L49.64-2.08L52.84-12.94L54.85-12.94L55.13-12.49L51.31 0L47.60 0Z" />
		<path d="M69.53 0L60.84 0L60.84-12.94L69.53-12.94L69.53-10.85L63.12-10.85L63.12-7.74L68.97-7.74L68.97-5.66L63.12-5.66L63.12-2.08L69.53-2.08L69.53 0Z" />
		<path d="M78.11 0L75.82 0L75.82-12.94L82.04-12.94Q85.10-12.94 85.10-9.88L85.10-9.88L85.10-7.76Q85.10-5.40 83.22-4.89L83.22-4.89L85.47-0.49L85.19 0L83.24 0L80.84-4.72L78.11-4.72L78.11 0ZM78.11-10.85L78.11-6.81L81.99-6.81Q82.81-6.81 82.81-7.63L82.81-7.63L82.81-10.05Q82.81-10.85 81.99-10.85L81.99-10.85L78.11-10.85Z" />
		<path d="M92.21 0L91.10-0.86L91.10-2.08L96.90-2.08Q97.72-2.08 97.72-2.89L97.72-2.89L97.72-4.31Q97.72-5.02 97.08-5.16L97.08-5.16L93.28-5.92Q91.10-6.36 91.10-8.85L91.10-8.85L91.10-9.88Q91.10-12.94 94.16-12.94L94.16-12.94L98.53-12.94L99.63-12.07L99.63-10.85L94.22-10.85Q93.39-10.85 93.39-10.05L93.39-10.05L93.39-8.79Q93.39-8.08 94.03-7.95L94.03-7.95L97.83-7.20Q100.01-6.75 100.01-4.27L100.01-4.27L100.01-3.06Q100.01 0 96.95 0L96.95 0L92.21 0Z" />
		<path d="M105.45 0L105.15-0.45L109.14-12.94L112.70-12.94L116.68-0.45L116.40 0L114.47 0L113.59-2.85L108.24-2.85L107.34 0L105.45 0ZM110.74-10.85L108.88-4.93L112.97-4.93L111.09-10.85L110.74-10.85Z" />
		<path d="M130.52 0L122.38 0L122.38-12.94L124.67-12.94L124.67-2.08L130.52-2.08L130.52 0Z" />
		<path d="M145.12 0L144.01-0.86L144.01-2.08L149.80-2.08Q150.63-2.08 150.63-2.89L150.63-2.89L150.63-4.31Q150.63-5.02 149.99-5.16L149.99-5.16L146.18-5.92Q144.01-6.36 144.01-8.85L144.01-8.85L144.01-9.88Q144.01-12.94 147.06-12.94L147.06-12.94L151.43-12.94L152.54-12.07L152.54-10.85L147.12-10.85Q146.30-10.85 146.30-10.05L146.30-10.05L146.30-8.79Q146.30-8.08 146.93-7.95L146.93-7.95L150.74-7.20Q152.91-6.75 152.91-4.27L152.91-4.27L152.91-3.06Q152.91 0 149.86 0L149.86 0L145.12 0Z" />
		<path d="M159.18-3.06L159.18-3.06L159.18-12.94L161.47-12.94L161.47-2.89Q161.47-2.08 162.29-2.08L162.29-2.08L166.10-2.08Q166.92-2.08 166.92-2.89L166.92-2.89L166.92-12.94L169.21-12.94L169.21-3.06Q169.21 0 166.15 0L166.15 0L162.24 0Q159.18 0 159.18-3.06Z" />
		<path d="M178.33 0L176.04 0L176.04-12.94L178.33-12.94L178.33 0Z" />
		<path d="M188.19-10.85L184.12-10.85L184.12-12.94L194.57-12.94L194.57-10.85L190.50-10.85L190.50 0L188.19 0L188.19-10.85Z" />
		<path d="M209.06 0L200.36 0L200.36-12.94L209.06-12.94L209.06-10.85L202.65-10.85L202.65-7.74L208.50-7.74L208.50-5.66L202.65-5.66L202.65-2.08L209.06-2.08L209.06 0Z" />
	</>
);

function QuasarInline({ idSuffix }: { idSuffix: string }) {
	return (
		<>
			<defs>
				<radialGradient id={`qc-${idSuffix}-adm`} cx=".5" cy=".5" r=".5">
					<stop offset="0%" stopColor="#FFF6D9" />
					<stop offset="35%" stopColor="#FFF6D9" stopOpacity=".9" />
					<stop offset="100%" stopColor="#FFF6D9" stopOpacity="0" />
				</radialGradient>
				<linearGradient id={`qj-${idSuffix}-adm`} x1=".5" y1="0" x2=".5" y2="1">
					<stop offset="0%" stopColor="#FFF6D9" stopOpacity="0" />
					<stop offset="50%" stopColor="#FFF6D9" stopOpacity=".9" />
					<stop offset="100%" stopColor="#FFF6D9" />
				</linearGradient>
				<linearGradient id={`qd-${idSuffix}-adm`} x1="0" y1=".5" x2="1" y2=".5">
					<stop offset="0%" stopColor="#8B3FE5" />
					<stop offset="50%" stopColor="#ED3F9E" />
					<stop offset="100%" stopColor="#8B3FE5" />
				</linearGradient>
			</defs>
			<path d="M15.6 15 Q15.9 9 16 2 Q16.1 9 16.4 15 Z" fill={`url(#qj-${idSuffix}-adm)`} />
			<path
				d="M15.6 17 Q15.9 22 16 28 Q16.1 22 16.4 17 Z"
				fill={`url(#qj-${idSuffix}-adm)`}
				opacity=".9"
			/>
			<ellipse
				cx="16"
				cy="16"
				rx="12"
				ry="3.4"
				transform="rotate(-22 16 16)"
				fill="none"
				stroke={`url(#qd-${idSuffix}-adm)`}
				strokeWidth="1.1"
			/>
			<ellipse
				cx="16"
				cy="16"
				rx="8.5"
				ry="2.3"
				transform="rotate(-22 16 16)"
				fill="none"
				stroke="#ED3F9E"
				strokeWidth=".55"
				strokeOpacity=".6"
				strokeDasharray=".7 1.1"
			/>
			<circle cx="16" cy="16" r="3.6" fill={`url(#qc-${idSuffix}-adm)`} />
			<circle cx="16" cy="16" r="1.1" fill="#FFF6D9" />
			<circle cx="22.4" cy="19.4" r=".95" fill="#3BD0F2" />
		</>
	);
}

// ────────────────────────────────────────────────────────────────────
// NeogesysLogoHorizontal (admin twin)
// ────────────────────────────────────────────────────────────────────

export function NeogesysLogoHorizontal({
	className,
	size,
	title = "NEOGESYS",
	ariaHidden = false,
}: MarkProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 260 40"
			width={size}
			height={size}
			className={className}
			role="img"
			aria-hidden={ariaHidden || undefined}
			aria-label={ariaHidden ? undefined : title}
		>
			{!ariaHidden ? <title>{title}</title> : null}
			<g transform="translate(4 4)">
				<QuasarInline idSuffix="nlh" />
			</g>
			<g transform="translate(44 34)" fill="currentColor">
				{WORDMARK_PATHS}
			</g>
		</svg>
	);
}

// ────────────────────────────────────────────────────────────────────
// NeogesysLogoFull — quasar + wordmark + tagline "Universal Suite"
// ────────────────────────────────────────────────────────────────────

export function NeogesysLogoFull({
	className,
	size,
	title = "NEOGESYS — Universal Suite",
	ariaHidden = false,
}: MarkProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 260 48"
			width={size}
			height={size}
			className={className}
			role="img"
			aria-hidden={ariaHidden || undefined}
			aria-label={ariaHidden ? undefined : title}
		>
			{!ariaHidden ? <title>{title}</title> : null}
			<g transform="translate(4 8)">
				<QuasarInline idSuffix="nlf" />
			</g>
			<g transform="translate(44 30)" fill="currentColor">
				{WORDMARK_PATHS}
			</g>
			<g transform="translate(44 46)" fill="currentColor" opacity=".55">
				{TAGLINE_PATHS}
			</g>
		</svg>
	);
}

// ────────────────────────────────────────────────────────────────────
// NeogesysWordmark — solo testo "NEOGESYS"
// ────────────────────────────────────────────────────────────────────

export function NeogesysWordmark({
	className,
	size,
	title = "NEOGESYS",
	ariaHidden = false,
}: MarkProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 212 30"
			width={size}
			height={size}
			className={className}
			role="img"
			fill="currentColor"
			aria-hidden={ariaHidden || undefined}
			aria-label={ariaHidden ? undefined : title}
		>
			{!ariaHidden ? <title>{title}</title> : null}
			<g transform="translate(0 27)">{WORDMARK_PATHS}</g>
		</svg>
	);
}
