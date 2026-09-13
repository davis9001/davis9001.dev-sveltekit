/**
 * Derive every number in the fruit-fly post from the machine it happened on.
 *
 *   bun run scripts/charts/fly/build-data.mjs [outFile]
 *
 * Two sources, both read live:
 *   1. Every git repository under ~/_Projects — commits per day across the
 *      21-day training window.
 *   2. ~/_Workbench/dirac's CLAUDE.md — word count at every commit that
 *      touched it, which is the instruction file's whole revision history.
 *
 * Nothing here is typed by hand. If a figure disagrees with the repos, the
 * repos are right and this script is the bug.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const WINDOW_START = '2026-08-24';
const WINDOW_END = '2026-09-13';
const PROJECTS = join(homedir(), '_Projects');
const DIRAC = join(homedir(), '_Workbench', 'dirac');

function git(cwd, args) {
	try {
		return execFileSync('git', args, {
			cwd,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		});
	} catch {
		return '';
	}
}

/** Every git work tree under ~/_Projects, up to three levels deep. */
function findRepos(root, depth = 3) {
	const found = [];
	const walk = (dir, left) => {
		if (left < 0) return;
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		// Keep descending past a repo — several projects hold a second,
		// separately-versioned repo inside them, and those are real work too.
		if (entries.some((e) => e.name === '.git')) {
			found.push(dir);
		}
		for (const e of entries) {
			if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
				walk(join(dir, e.name), left - 1);
			}
		}
	};
	walk(root, depth);
	return found;
}

function dayRange(start, end) {
	const days = [];
	for (
		let d = new Date(`${start}T00:00:00Z`);
		d <= new Date(`${end}T00:00:00Z`);
		d.setUTCDate(d.getUTCDate() + 1)
	) {
		days.push(d.toISOString().slice(0, 10));
	}
	return days;
}

const repos = findRepos(PROJECTS);
const perDay = Object.fromEntries(dayRange(WINDOW_START, WINDOW_END).map((d) => [d, 0]));
let activeRepos = 0;

for (const repo of repos) {
	const out = git(repo, [
		'log',
		`--since=${WINDOW_START}`,
		`--until=${WINDOW_END} 23:59:59`,
		'--format=%ad',
		'--date=short'
	]);
	const dates = out.split('\n').filter(Boolean);
	if (dates.length > 0) activeRepos += 1;
	for (const d of dates) {
		if (d in perDay) perDay[d] += 1;
	}
}

const commits = Object.entries(perDay).map(([date, count]) => ({ date, count }));
const totalCommits = commits.reduce((sum, c) => sum + c.count, 0);
const activeDays = commits.filter((c) => c.count > 0).length;

// The instruction file's revision history: word count at every commit.
const instructionHistory = [];
if (existsSync(DIRAC) && statSync(DIRAC).isDirectory()) {
	const log = git(DIRAC, [
		'log',
		'--format=%H %ad',
		'--date=short',
		'--reverse',
		'--',
		'CLAUDE.md'
	]);
	for (const line of log.split('\n').filter(Boolean)) {
		const [hash, date] = line.split(' ');
		const body = git(DIRAC, ['show', `${hash}:CLAUDE.md`]);
		if (!body) continue;
		instructionHistory.push({ date, words: body.split(/\s+/).filter(Boolean).length });
	}
}

// Memory files: one durable fact per file, across every project.
const memoryRoot = join(homedir(), '.claude', 'projects');
let memoryFiles = 0;
let memoryProjects = 0;
try {
	for (const project of readdirSync(memoryRoot, { withFileTypes: true })) {
		if (!project.isDirectory()) continue;
		const dir = join(memoryRoot, project.name, 'memory');
		if (!existsSync(dir)) continue;
		const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'MEMORY.md');
		if (files.length === 0) continue;
		memoryProjects += 1;
		memoryFiles += files.length;
	}
} catch {
	/* no memory directory on this machine */
}

const data = {
	generatedAt: new Date().toISOString(),
	window: { start: WINDOW_START, end: WINDOW_END, days: commits.length },
	commits,
	totalCommits,
	activeDays,
	activeRepos,
	totalRepos: repos.length,
	fly: { commits: 0, days: commits.length },
	instructionHistory,
	instructionPeak: Math.max(...instructionHistory.map((p) => p.words)),
	memoryFiles,
	memoryProjects
};

const outFile =
	process.argv[2] ?? join(dirname(new URL(import.meta.url).pathname), 'chart-data.json');
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(data, null, '\t')}\n`);

console.log(
	`${totalCommits} commits / ${activeDays} active days / ${activeRepos} of ${repos.length} repos · ` +
		`instructions ${instructionHistory.length} revisions · ${memoryFiles} memory files`
);
