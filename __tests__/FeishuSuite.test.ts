import { execFileSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

function read(rel: string) {
	return readFileSync(join(root, rel), 'utf8');
}

describe('Feishu Suite package', () => {
	const pkg = JSON.parse(read('package.json'));

	it('is version 0.1.0 with community-node metadata', () => {
		expect(pkg.name).toBe('n8n-nodes-feishu-suite');
		expect(pkg.version).toBe('0.1.0');
		expect(pkg.keywords).toContain('n8n-community-node-package');
		expect(pkg.homepage).toBe('https://github.com/RandallAnjie/n8n-nodes-feishu-suite#readme');
		expect(pkg.repository.url).toBe('https://github.com/RandallAnjie/n8n-nodes-feishu-suite.git');
		expect(pkg.files).toEqual(expect.arrayContaining(['dist', 'LICENSE', 'NOTICE', 'README.md', 'CHANGELOG.md']));
		expect(pkg.dependencies).not.toHaveProperty('glob');
		expect(pkg.dependencies).not.toHaveProperty('n8n-workflow');
		expect(Object.keys(pkg.dependencies).sort()).toEqual(
			['form-data', 'isbot', 'luxon', 'protobufjs', 'sanitize-html', 'ws'].sort(),
		);
	});

	it('lists every compiled node and credential path', () => {
		expect(pkg.n8n.credentials).toEqual([
			'dist/credentials/FeishuSuiteApi.credentials.js',
			'dist/credentials/FeishuSuiteOAuth2Api.credentials.js',
		]);
		expect(pkg.n8n.nodes).toHaveLength(21);
		expect(pkg.n8n.nodes).toContain('dist/nodes/FeishuSuite/FeishuSuite.node.js');
		expect(new Set(pkg.n8n.nodes).size).toBe(pkg.n8n.nodes.length);
	});

	it('uses unique credential type names', () => {
		const enums = read('nodes/help/type/enums.ts');
		expect(enums).toContain("TenantToken = 'feishuSuiteApi'");
		expect(enums).toContain("UserToken = 'feishuSuiteOAuth2Api'");
		expect(enums).not.toContain("TenantToken = 'larkApi'");
		expect(enums).not.toContain("UserToken = 'larkOAuth2Api'");
	});

	it('defaults credential tests to Feishu China and supports Lark URLs', () => {
		const tenant = read('credentials/FeishuSuiteApi.credentials.ts');
		const oauth = read('credentials/FeishuSuiteOAuth2Api.credentials.ts');
		expect(tenant).toContain('default: BaseUrl.China');
		expect(oauth).toContain('default: BaseUrl.China');
		expect(tenant).toContain('/open-apis/auth/v3/tenant_access_token/internal');
		expect(tenant).toContain("baseURL: '={{$credentials.baseUrl}}'");
		expect(oauth).toContain('/open-apis/authen/v1/user_info');
		expect(oauth).toContain('https://accounts.feishu.cn/open-apis/authen/v1/authorize');
		expect(oauth).toContain('https://accounts.larksuite.com/open-apis/authen/v1/authorize');
		expect(oauth).toContain('https://open.feishu.cn/open-apis/authen/v2/oauth/token');
		expect(oauth).toContain('https://open.larksuite.com/open-apis/authen/v2/oauth/token');
	});

	it('has unique node names and displayNames', () => {
		const files = [
			'nodes/FeishuSuite/FeishuSuite.node.ts',
			'nodes/FeishuSuite/FeishuSuiteTrigger.node.ts',
			'nodes/FeishuSuite/FeishuSuiteWebhookTrigger.node.ts',
			'nodes/FeishuSuite/RespondToFeishuSuite.node.ts',
			'nodes/FeishuSuiteBase/FeishuSuiteBase.node.ts',
			'nodes/FeishuSuiteCalendar/FeishuSuiteCalendar.node.ts',
			'nodes/FeishuSuiteChat/FeishuSuiteChat.node.ts',
			'nodes/FeishuSuiteContacts/FeishuSuiteContacts.node.ts',
			'nodes/FeishuSuiteDocument/FeishuSuiteDocument.node.ts',
			'nodes/FeishuSuiteMessage/FeishuSuiteMessage.node.ts',
			'nodes/FeishuSuiteSpace/FeishuSuiteSpace.node.ts',
			'nodes/FeishuSuiteSpreadsheet/FeishuSuiteSpreadsheet.node.ts',
			'nodes/FeishuSuiteTask/FeishuSuiteTask.node.ts',
			'nodes/FeishuSuiteWiki/FeishuSuiteWiki.node.ts',
			'nodes/FeishuSuiteApproval/FeishuSuiteApproval.node.ts',
			'nodes/FeishuSuiteMail/FeishuSuiteMail.node.ts',
			'nodes/FeishuSuiteMinutes/FeishuSuiteMinutes.node.ts',
			'nodes/FeishuSuiteVc/FeishuSuiteVc.node.ts',
			'nodes/FeishuSuiteAttendance/FeishuSuiteAttendance.node.ts',
			'nodes/FeishuSuiteAily/FeishuSuiteAily.node.ts',
			'nodes/FeishuSuiteSearch/FeishuSuiteSearch.node.ts',
		];
		const names: string[] = [];
		const displayNames: string[] = [];
		for (const file of files) {
			const src = read(file);
			const name = src.match(/\n\t\tname: '([^']+)'/)?.[1];
			const displayName = src.match(/displayName: '([^']+)'/)?.[1];
			expect(name).toBeTruthy();
			expect(displayName).toBeTruthy();
			names.push(name as string);
			displayNames.push(displayName as string);
		}
		expect(new Set(names).size).toBe(names.length);
		expect(new Set(displayNames).size).toBe(displayNames.length);
	});

	it('does not keep leftover upstream credential or node type names', () => {
		const src = [
			read('nodes/FeishuSuite/resource/message/MessageSearch.operation.ts'),
			read('nodes/FeishuSuiteSpace/FeishuSuiteSpace.node.ts'),
			read('nodes/FeishuSuite/FeishuSuiteWebhookTrigger.node.ts'),
			read('nodes/FeishuSuite/RespondToFeishuSuite.node.ts'),
			read('credentials/FeishuSuiteApi.credentials.ts'),
			read('credentials/FeishuSuiteOAuth2Api.credentials.ts'),
		].join('\n');
		expect(src).not.toContain('Lark OAuth2 API');
		expect(src).not.toContain("name: 'Lark Drive'");
		expect(src).not.toContain("name: 'Lark Webhook Trigger'");
		expect(src).not.toContain('larkApi');
		expect(src).not.toContain('larkOAuth2Api');
	});
});

describe('compiled ResourceFactory', () => {
	it('loads every operation from dist/nodes/FeishuSuite', () => {
		const basedir = join(root, 'dist/nodes/FeishuSuite');
		const resourceDirs = readdirSync(join(basedir, 'resource'), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort();
		const compiledOps = resourceDirs.flatMap((dir) =>
			readdirSync(join(basedir, 'resource', dir)).filter(
				(file) => file.endsWith('.js') && !file.endsWith('.d.ts'),
			),
		);
		expect(compiledOps).toHaveLength(269);
		expect(existsSync(join(root, 'dist/credentials/lark_icon.svg'))).toBe(true);
		expect(existsSync(join(basedir, 'lark_icon.svg'))).toBe(true);

		const script = `
const path = require('path');
const ResourceFactory = require('./dist/nodes/help/builder/ResourceFactory.js').default;
const builder = ResourceFactory.build(path.join(process.cwd(), 'dist/nodes/FeishuSuite'));
const count = builder.resources.reduce((sum, resource) => sum + resource.operations.length, 0);
process.stdout.write(JSON.stringify({
	count,
	resources: builder.resources.map((resource) => resource.value).sort(),
}));
`;
		const loaded = JSON.parse(
			execFileSync(process.execPath, ['-e', script], { cwd: root, encoding: 'utf8' }),
		);
		expect(loaded.count).toBe(269);
		expect(loaded.resources).toEqual(resourceDirs);
	});
});
