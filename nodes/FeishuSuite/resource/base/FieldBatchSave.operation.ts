import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { DESCRIPTIONS } from '../../../help/description';
import { WORDING } from '../../../help/wording';
import NodeUtils from '../../../help/utils/node';
import { BITABLE_FIELD_TYPE_NOTICE } from '../../../help/utils/bitableRecord';

export default {
	name: 'Batch Save Fields (批量保存字段)',
	value: 'batchSaveFields',
	order: 70,
	options: [
		DESCRIPTIONS.BASE_APP_TOKEN,
		DESCRIPTIONS.BASE_TABLE_ID,
		{
			displayName: 'Fields (字段列表 JSON)',
			name: 'fields',
			type: 'json',
			required: true,
			default: '[]',
			description: `${BITABLE_FIELD_TYPE_NOTICE} 数组项含 field_name + type；带 field_id 则更新。`,
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-field/create">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = NodeUtils.getResourceId(this, 'app_token', index);
		const table_id = NodeUtils.getResourceId(this, 'table_id', index);
		const fields = NodeUtils.getNodeJsonData(this, 'fields', index, []) as IDataObject[];
		if (!Array.isArray(fields) || fields.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Fields must be a non-empty JSON array');
		}

		const results: IDataObject[] = [];
		for (const field of fields) {
			const fieldId = field.field_id as string | undefined;
			if (fieldId) {
				const { data } = await RequestUtils.request.call(this, {
					method: 'PUT',
					url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/fields/${fieldId}`,
					body: field,
				});
				results.push({ action: 'updated', ...(data as IDataObject) });
			} else {
				const { data } = await RequestUtils.request.call(this, {
					method: 'POST',
					url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/fields`,
					body: field,
				});
				results.push({ action: 'created', ...(data as IDataObject) });
			}
		}
		return { items: results };
	},
} as ResourceOperation;
