import { DateTime } from 'luxon';
import type { IDataObject } from 'n8n-workflow';

/** Official batch_create / batch_update / batch_delete limit. */
export const BITABLE_BATCH_LIMIT = 500;

export const BITABLE_DEFAULT_TIME_ZONE = 'Asia/Shanghai';

export const BITABLE_FIELD_TYPES: Record<number, string> = {
	1: '文本 Text',
	2: '数字 Number',
	3: '单选 Single Select',
	4: '多选 Multi Select',
	5: '日期 Date',
	7: '复选框 Checkbox',
	11: '人员 Person',
	13: '电话 Phone',
	15: '超链接 URL',
	17: '附件 Attachment',
	18: '单向关联 Link',
	19: '查找引用 Lookup (只读)',
	20: '公式 Formula (只读)',
	21: '双向关联 Duplex Link',
	22: '地理位置 Location',
	23: '群组 Group',
	24: '阶段 Stage (只读)',
	1001: '创建时间 Created Time (只读)',
	1002: '修改时间 Modified Time (只读)',
	1003: '创建人 Created User (只读)',
	1004: '修改人 Modified User (只读)',
	1005: '自动编号 Auto Number (只读)',
	3001: '按钮 Button (只读)',
};

export const BITABLE_FIELD_TYPE_NOTICE =
	'字段 type：1 文本 / 2 数字 / 3 单选 / 4 多选 / 5 日期 / 7 复选框 / 11 人员 / 13 电话 / 15 超链接 / 17 附件 / 18 单向关联 / 19 查找引用(只读) / 20 公式(只读) / 21 双向关联 / 22 地理位置。记录 JSON 的键必须是字段名称，不是 field_id。日期用 Unix 毫秒（可写 2026-10-12，节点会按 Asia/Shanghai 转换）。超链接写 {text,link}（裸 URL 字符串也会自动转换）。批量单次最多 500 条，超过会拆批。';

export const BITABLE_RECORD_HINT =
	'记录 JSON 的键是字段名称（字段名称），不是 field_id。日期 / 创建时间是 Unix 毫秒；时区默认 Asia/Shanghai。超链接 {text,link}；人员 [{id}]；关联 [record_id]；附件 [{file_token}]；地理位置 "lng,lat"。公式和查找引用只读。';

export function fieldTypeLabel(type: unknown): string {
	const numeric = typeof type === 'number' ? type : Number(type);
	if (!Number.isFinite(numeric)) {
		return '字段';
	}
	return BITABLE_FIELD_TYPES[numeric] ?? `type ${numeric}`;
}

export function formatFieldPickerLabel(field: {
	field_name?: unknown;
	field_id?: unknown;
	type?: unknown;
}): string {
	const name = String(field.field_name ?? '');
	const id = String(field.field_id ?? '');
	const type = fieldTypeLabel(field.type);
	return id ? `${name} · ${type} (${id})` : `${name} · ${type}`;
}

export function chunkArray<T>(items: T[], size = BITABLE_BATCH_LIMIT): T[][] {
	if (!Array.isArray(items) || items.length === 0) {
		return [];
	}
	const chunks: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		chunks.push(items.slice(i, i + size));
	}
	return chunks;
}

const URL_RE = /^https?:\/\/\S+$/i;
const DATE_RE =
	/^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const PERSON_ID_RE = /^(ou_|on_)[a-zA-Z0-9]+$/;
const RECORD_ID_RE = /^rec[a-zA-Z0-9]+$/;
const FILE_TOKEN_RE = /^(boxcn|boxc|DRiF|BZk3|EmL4|Vl3F)[a-zA-Z0-9]+/;
const COORD_RE = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
const DATE_FORMATS = [
	'yyyy-MM-dd HH:mm:ss',
	'yyyy-MM-dd HH:mm',
	'yyyy/MM/dd HH:mm:ss',
	'yyyy/MM/dd HH:mm',
	'yyyy-MM-dd',
	'yyyy/MM/dd',
];

export function normalizeUrlValue(value: unknown): unknown {
	if (typeof value === 'string' && URL_RE.test(value.trim())) {
		const link = value.trim();
		return { text: link, link };
	}
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		const obj = value as IDataObject;
		if (typeof obj.link === 'string' && obj.link && !obj.text) {
			return { text: obj.link, link: obj.link };
		}
		if (typeof obj.url === 'string' && obj.url && !obj.link) {
			return { text: (obj.text as string) || obj.url, link: obj.url };
		}
	}
	return value;
}

export function normalizeDateValue(
	value: unknown,
	timeZone = BITABLE_DEFAULT_TIME_ZONE,
): unknown {
	if (typeof value === 'number' && Number.isFinite(value)) {
		// Unix seconds (~1e9) vs already-ms (~1e12). Leave small numbers (amount/rating) alone.
		return value >= 1e9 && value < 1e11 ? Math.round(value * 1000) : value;
	}
	if (typeof value !== 'string') {
		return value;
	}
	const trimmed = value.trim();
	if (!DATE_RE.test(trimmed)) {
		return value;
	}
	const iso = DateTime.fromISO(trimmed, { zone: timeZone });
	if (iso.isValid) {
		return iso.toMillis();
	}
	for (const fmt of DATE_FORMATS) {
		const parsed = DateTime.fromFormat(trimmed, fmt, { zone: timeZone });
		if (parsed.isValid) {
			return parsed.toMillis();
		}
	}
	return value;
}

export function normalizePersonValue(value: unknown): unknown {
	if (typeof value === 'string' && PERSON_ID_RE.test(value.trim())) {
		return [{ id: value.trim() }];
	}
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		const id = (value as IDataObject).id;
		if (typeof id === 'string' && id) {
			return [{ id }];
		}
	}
	return value;
}

export function normalizeLinkValue(value: unknown): unknown {
	if (typeof value === 'string' && RECORD_ID_RE.test(value.trim())) {
		return [value.trim()];
	}
	return value;
}

export function normalizeAttachmentValue(value: unknown): unknown {
	if (typeof value === 'string' && FILE_TOKEN_RE.test(value.trim())) {
		return [{ file_token: value.trim() }];
	}
	return value;
}

export function normalizeCheckboxValue(value: unknown): unknown {
	if (value === 'true' || value === 'TRUE') {
		return true;
	}
	if (value === 'false' || value === 'FALSE') {
		return false;
	}
	return value;
}

export function normalizeLocationValue(value: unknown): unknown {
	if (typeof value === 'string' && COORD_RE.test(value.trim())) {
		return value.trim().replace(/\s+/g, '');
	}
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		const obj = value as IDataObject;
		if (typeof obj.location === 'string' && COORD_RE.test(obj.location)) {
			return obj.location.trim().replace(/\s+/g, '');
		}
	}
	return value;
}

export function normalizeFieldValue(value: unknown, timeZone = BITABLE_DEFAULT_TIME_ZONE): unknown {
	if (value === null || value === undefined) {
		return value;
	}
	let next = normalizeUrlValue(value);
	next = normalizeDateValue(next, timeZone);
	next = normalizePersonValue(next);
	next = normalizeLinkValue(next);
	next = normalizeAttachmentValue(next);
	next = normalizeCheckboxValue(next);
	next = normalizeLocationValue(next);
	return next;
}

export function normalizeFields(
	fields: IDataObject,
	timeZone = BITABLE_DEFAULT_TIME_ZONE,
): IDataObject {
	const out: IDataObject = {};
	for (const [key, value] of Object.entries(fields)) {
		out[key] = normalizeFieldValue(value, timeZone) as IDataObject[string];
	}
	return out;
}

export function normalizeRecordPayload(
	body: IDataObject,
	timeZone = BITABLE_DEFAULT_TIME_ZONE,
): IDataObject {
	const next: IDataObject = { ...body };
	if (next.fields && typeof next.fields === 'object' && !Array.isArray(next.fields)) {
		next.fields = normalizeFields(next.fields as IDataObject, timeZone);
	}
	if (Array.isArray(next.records)) {
		next.records = (next.records as IDataObject[]).map((record) => {
			if (record && typeof record === 'object' && !Array.isArray(record) && record.fields) {
				return {
					...record,
					fields: normalizeFields(record.fields as IDataObject, timeZone),
				};
			}
			return record;
		});
	}
	return next;
}

export function extractRecordIdList(body: IDataObject): string[] {
	const records = body.records ?? body.record_ids;
	if (!Array.isArray(records)) {
		return [];
	}
	return records
		.map((item) => {
			if (typeof item === 'string') {
				return item;
			}
			if (item && typeof item === 'object') {
				const rec = item as IDataObject;
				return String(rec.record_id ?? rec.id ?? '');
			}
			return '';
		})
		.filter(Boolean);
}
