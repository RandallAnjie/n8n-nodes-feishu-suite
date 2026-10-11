import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Batch Save Fields (批量保存字段)',
	value: 'batchSaveFields',
	order: 70,
	options: [
		{
			displayName:
				'<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-field/create">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'App Token',
			name: 'app_token',
			type: 'string',
			required: true,
			typeOptions: { password: true },
			default: '',
			description: 'Bitable app token',
		},
		{
			displayName: 'Table ID',
			name: 'table_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Bitable table ID',
		},
		{
			displayName: 'Fields',
			name: 'fields',
			type: 'json',
			required: true,
			default: '[]',
			description:
				'JSON array of field objects. Each item needs field_name and type; include field_id to update.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = this.getNodeParameter('app_token', index) as string;
		const table_id = this.getNodeParameter('table_id', index) as string;
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
