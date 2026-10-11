import { readFileSync } from 'fs';
import { join } from 'path';

describe('Feishu Suite', () => {
	it('uses unique credential type names', () => {
		const enums = readFileSync(join(__dirname, '../nodes/help/type/enums.ts'), 'utf8');
		expect(enums).toContain("TenantToken = 'feishuSuiteApi'");
		expect(enums).toContain("UserToken = 'feishuSuiteOAuth2Api'");
	});

	it('registers unique node type names', () => {
		const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
		expect(pkg.name).toBe('n8n-nodes-feishu-suite');
		expect(pkg.n8n.credentials).toEqual([
			'dist/credentials/FeishuSuiteApi.credentials.js',
			'dist/credentials/FeishuSuiteOAuth2Api.credentials.js',
		]);
		expect(pkg.n8n.nodes).toContain('dist/nodes/FeishuSuite/FeishuSuite.node.js');
	});
});
