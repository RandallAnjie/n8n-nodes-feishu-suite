#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const resourceDir = path.join(__dirname, '..', 'nodes', 'FeishuSuite', 'resource');
const SNAE_BASELINE = {
	base: 36,
	calendar: 19,
	chat: 17,
	contacts: 5,
	document: 10,
	message: 37,
	space: 12,
	spreadsheet: 24,
	task: 6,
	wiki_spaces: 12,
};

function listOperations() {
	const resources = {};
	for (const entry of fs.readdirSync(resourceDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const dir = path.join(resourceDir, entry.name);
		const ops = fs
			.readdirSync(dir)
			.filter((file) => file.endsWith('.operation.ts'))
			.sort();
		resources[entry.name] = ops.map((file) => file.replace(/\.operation\.ts$/, ''));
	}
	return resources;
}

function main() {
	const resources = listOperations();
	const rows = Object.keys(resources)
		.sort()
		.map((name) => {
			const count = resources[name].length;
			const baseline = SNAE_BASELINE[name] ?? 0;
			return {
				resource: name,
				count,
				baseline,
				delta: count - baseline,
				operations: resources[name],
			};
		});
	const total = rows.reduce((sum, row) => sum + row.count, 0);
	const baselineTotal = Object.values(SNAE_BASELINE).reduce((sum, n) => sum + n, 0);
	const report = {
		total,
		snaeBaseline: baselineTotal,
		delta: total - baselineTotal,
		modules: rows,
	};
	const outDir = path.join(__dirname, '..');
	fs.writeFileSync(path.join(outDir, 'operations-report.json'), JSON.stringify(report, null, 2));
	console.log(`Feishu Suite operations: ${total} (snae baseline ${baselineTotal}, +${total - baselineTotal})`);
	for (const row of rows) {
		const mark = row.baseline ? `${row.baseline} -> ${row.count} (${row.delta >= 0 ? '+' : ''}${row.delta})` : String(row.count);
		console.log(`- ${row.resource}: ${mark}`);
	}
}

main();
