#!/usr/bin/env node
/**
 * NEOGESYS Sport · Release script
 * ═══════════════════════════════════════════════════════════════════════════
 * Automatizza il bump di versione (CalVer `YYYY.M.PATCH`) e la manutenzione
 * del CHANGELOG.md. Pensato per funzionare ANCHE in fase dev, senza richiedere
 * che tutto sia perfetto — lancia un warning se qualcosa manca ma prosegue.
 *
 * Uso:
 *   node scripts/release.mjs patch         # 2026.4.1 → 2026.4.2
 *   node scripts/release.mjs minor         # 2026.4.x → 2026.5.0
 *   node scripts/release.mjs calver        # forza YYYY.M.0 del mese corrente
 *   node scripts/release.mjs --dry-run     # calcola la nuova versione senza scrivere
 *   node scripts/release.mjs --tag         # aggiunge anche git tag vX.Y.Z
 *
 * Effetti:
 *   1. Legge VERSION
 *   2. Calcola la nuova versione in base al comando
 *   3. Scrive VERSION (a meno di --dry-run)
 *   4. Inserisce una sezione `## [NEW_VERSION] · YYYY-MM-DD` in CHANGELOG.md
 *      subito dopo il blocco `## [Unreleased]`, preservando le note già
 *      annotate lì dentro (vengono spostate nella nuova versione)
 *   5. Se `--tag` è presente, crea un git tag v<newVersion>
 *
 * Nota: non fa commit/push. Lascia le modifiche staged per rivedere e
 * controllare a mano prima del push (tipicamente con `git commit -m "release: X.Y.Z"`).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const VERSION_FILE = resolve(ROOT, "VERSION");
const CHANGELOG_FILE = resolve(ROOT, "CHANGELOG.md");
const ROOT_PKG = resolve(ROOT, "package.json");

/** File TS/JS dove la costante `STATIC_VERSION` va tenuta allineata. */
const VERSION_MIRRORS = [
	resolve(ROOT, "apps/web/src/lib/version.ts"),
	resolve(ROOT, "apps/api/src/lib/version.ts"),
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function readVersion() {
	if (!existsSync(VERSION_FILE)) {
		console.error(`✗ VERSION file mancante: ${VERSION_FILE}`);
		process.exit(1);
	}
	const raw = readFileSync(VERSION_FILE, "utf8").trim();
	const m = raw.match(/^(\d{4})\.(\d{1,2})\.(\d+)$/);
	if (!m) {
		console.error(`✗ Formato VERSION non valido: "${raw}" (atteso: YYYY.M.PATCH)`);
		process.exit(1);
	}
	return { year: +m[1], month: +m[2], patch: +m[3], raw };
}

function bump(current, mode) {
	const now = new Date();
	const y = now.getFullYear();
	const mo = now.getMonth() + 1;

	switch (mode) {
		case "patch":
			return { year: current.year, month: current.month, patch: current.patch + 1 };
		case "minor":
			return { year: y, month: mo, patch: 0 };
		case "major":
			// Il "major" in CalVer è un nuovo anno.
			return { year: y, month: mo, patch: 0 };
		case "calver":
			return { year: y, month: mo, patch: 0 };
		default:
			console.error(`✗ Modalità sconosciuta: "${mode}". Usa patch | minor | major | calver.`);
			process.exit(1);
	}
}

function formatVersion(v) {
	return `${v.year}.${v.month}.${v.patch}`;
}

function todayIso() {
	const d = new Date();
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

/**
 * Inserisce la nuova versione nel CHANGELOG, mantenendo (e svuotando) il
 * blocco `## [Unreleased]` in testa. Le note Unreleased diventano le note
 * della nuova release.
 */
function updateChangelog(newVersion) {
	if (!existsSync(CHANGELOG_FILE)) {
		console.warn(`! CHANGELOG.md non trovato — salto l'aggiornamento.`);
		return;
	}
	const content = readFileSync(CHANGELOG_FILE, "utf8");
	const unreleasedMatch = content.match(/^## \[Unreleased\][^\n]*\n([\s\S]*?)(?=^## \[)/m);

	const unreleasedNotes = unreleasedMatch
		? unreleasedMatch[1].trim()
		: "_Nessuna nota Unreleased — release vuota._";

	const newEntry = [
		`## [${newVersion}] · ${todayIso()}`,
		"",
		unreleasedNotes,
		"",
		"---",
		"",
	].join("\n");

	const resetUnreleased = `## [Unreleased]\n\n_(nessuna nota — pronta per la prossima release)_\n\n---\n\n`;

	let next;
	if (unreleasedMatch) {
		const beforeUnreleased = content.slice(0, unreleasedMatch.index);
		const afterUnreleased = content.slice(unreleasedMatch.index + unreleasedMatch[0].length);
		// Rimuove l'eventuale `---` residuo subito dopo il blocco Unreleased
		const cleanedAfter = afterUnreleased.replace(/^---\s*\n+/, "");
		next = `${beforeUnreleased}${resetUnreleased}${newEntry}${cleanedAfter}`;
	} else {
		// Fallback: inserisce in cima
		next = `${resetUnreleased}${newEntry}${content}`;
	}
	writeFileSync(CHANGELOG_FILE, next, "utf8");
	console.log(`✓ CHANGELOG.md aggiornato con [${newVersion}]`);
}

function gitTag(version) {
	try {
		execSync(`git tag v${version}`, { cwd: ROOT, stdio: "inherit" });
		console.log(`✓ git tag v${version} creato`);
	} catch (err) {
		console.warn(`! git tag fallito: ${err.message}`);
	}
}

/**
 * Allinea la costante `STATIC_VERSION` nei mirror TS (apps/web e apps/api)
 * e il campo "version" del package.json al root. Non rompe mai il sorgente:
 * se il marker non è trovato, emette un warning ma non lancia errore.
 */
function updateMirrors(newVersion) {
	for (const file of VERSION_MIRRORS) {
		if (!existsSync(file)) {
			console.warn(`! Mirror versione non trovato: ${file}`);
			continue;
		}
		const content = readFileSync(file, "utf8");
		const re = /const\s+STATIC_VERSION\s*=\s*"[^"]*";/;
		if (!re.test(content)) {
			console.warn(`! Marker STATIC_VERSION non trovato in ${file} — salto.`);
			continue;
		}
		const next = content.replace(re, `const STATIC_VERSION = "${newVersion}";`);
		writeFileSync(file, next, "utf8");
		console.log(`✓ Mirror aggiornato: ${file.replace(`${ROOT}/`, "")}`);
	}

	if (existsSync(ROOT_PKG)) {
		try {
			const pkg = JSON.parse(readFileSync(ROOT_PKG, "utf8"));
			pkg.version = newVersion;
			writeFileSync(ROOT_PKG, `${JSON.stringify(pkg, null, "\t")}\n`, "utf8");
			console.log(`✓ Root package.json version = ${newVersion}`);
		} catch (err) {
			console.warn(`! Impossibile aggiornare package.json: ${err.message}`);
		}
	}
}

// ─── Main ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const mode = args.find((a) => !a.startsWith("--")) ?? "patch";
const dryRun = args.includes("--dry-run");
const doTag = args.includes("--tag");

const current = readVersion();
const nextV = bump(current, mode);
const next = formatVersion(nextV);

console.log(`  Versione corrente : ${current.raw}`);
console.log(`  Nuova versione    : ${next}`);
console.log(`  Modalità          : ${mode}${dryRun ? " (dry-run)" : ""}`);

if (dryRun) {
	process.exit(0);
}

writeFileSync(VERSION_FILE, `${next}\n`, "utf8");
console.log(`✓ VERSION scritto: ${next}`);

updateMirrors(next);
updateChangelog(next);

if (doTag) {
	gitTag(next);
}

console.log("");
console.log("  Prossimi step (manuali):");
console.log(`    git add VERSION CHANGELOG.md`);
console.log(`    git commit -m "release: ${next}"`);
if (!doTag) console.log(`    git tag v${next}`);
console.log(`    git push --follow-tags`);
