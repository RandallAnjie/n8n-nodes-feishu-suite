import { FeishuSuite } from '../nodes/FeishuSuite/FeishuSuite.node';

describe('Lark Node', () => {
	let lark: FeishuSuite;

	beforeEach(() => {
		lark = new FeishuSuite();
	});

	it('should have the correct node type', () => {
		expect(lark.description.name).toBe('feishuSuite');
	});

	it('should have properties defined', () => {
		expect(lark.description.properties).toBeDefined();
	});
});
