import {
	BITABLE_BATCH_LIMIT,
	chunkArray,
	extractRecordIdList,
	fieldTypeLabel,
	formatFieldPickerLabel,
	normalizeDateValue,
	normalizeFieldValue,
	normalizeFields,
	normalizeRecordPayload,
	normalizeUrlValue,
} from '../nodes/help/utils/bitableRecord';

describe('bitableRecord', () => {
	it('chunks at the official 500-record limit', () => {
		expect(BITABLE_BATCH_LIMIT).toBe(500);
		const items = Array.from({ length: 501 }, (_, i) => i);
		const chunks = chunkArray(items, BITABLE_BATCH_LIMIT);
		expect(chunks).toHaveLength(2);
		expect(chunks[0]).toHaveLength(500);
		expect(chunks[1]).toHaveLength(1);
	});

	it('converts a bare URL string to {text,link}', () => {
		expect(normalizeUrlValue('https://example.com/path')).toEqual({
			text: 'https://example.com/path',
			link: 'https://example.com/path',
		});
		expect(normalizeUrlValue({ url: 'https://feishu.cn' })).toEqual({
			text: 'https://feishu.cn',
			link: 'https://feishu.cn',
		});
	});

	it('converts Asia/Shanghai calendar dates to Unix milliseconds', () => {
		expect(normalizeDateValue('2026-10-12')).toBe(Date.parse('2026-10-11T16:00:00.000Z'));
		expect(normalizeDateValue('2026-10-12 08:00:00')).toBe(Date.parse('2026-10-12T00:00:00.000Z'));
		expect(normalizeDateValue(1_767_225_600)).toBe(1_767_225_600_000);
		expect(normalizeDateValue(1_767_225_600_000)).toBe(1_767_225_600_000);
		expect(normalizeDateValue(21)).toBe(21);
		expect(normalizeDateValue('not-a-date')).toBe('not-a-date');
	});

	it('normalizes person, link, attachment, checkbox and location shapes', () => {
		expect(normalizeFieldValue('ou_2910013f1e6456f16a0ce75ede950a0a')).toEqual([
			{ id: 'ou_2910013f1e6456f16a0ce75ede950a0a' },
		]);
		expect(normalizeFieldValue('recHTLvO7x')).toEqual(['recHTLvO7x']);
		expect(normalizeFieldValue('boxcnrHpsg1QDqXAAAyachabcef')).toEqual([
			{ file_token: 'boxcnrHpsg1QDqXAAAyachabcef' },
		]);
		expect(normalizeFieldValue('true')).toBe(true);
		expect(normalizeFieldValue('116.397755, 39.903179')).toBe('116.397755,39.903179');
	});

	it('normalizes a create / batch payload in place of field names', () => {
		const body = normalizeRecordPayload({
			fields: {
				Name: 'row',
				Website: 'https://example.com',
				Due: '2026-10-12',
			},
			records: [
				{
					fields: { Website: 'https://feishu.cn', Done: 'false' },
				},
			],
		});
		expect((body.fields as { Website: { link: string } }).Website.link).toBe('https://example.com');
		expect(typeof (body.fields as { Due: number }).Due).toBe('number');
		const records = body.records as Array<{ fields: { Done: boolean } }>;
		expect(records[0].fields.Done).toBe(false);
	});

	it('extracts record ids from batch-delete bodies', () => {
		expect(extractRecordIdList({ records: ['recA', { record_id: 'recB' }] })).toEqual([
			'recA',
			'recB',
		]);
	});

	it('labels field pickers with type and id', () => {
		expect(fieldTypeLabel(15)).toMatch(/超链接/);
		expect(
			formatFieldPickerLabel({ field_name: 'Website', field_id: 'fld1', type: 15 }),
		).toBe('Website · 超链接 URL (fld1)');
	});

	it('leaves ordinary text alone', () => {
		expect(normalizeFields({ Name: 'hello', Amount: 21 })).toEqual({
			Name: 'hello',
			Amount: 21,
		});
	});
});
