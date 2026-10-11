import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Upsert Record (更新或新建记录)',
	value: 'upsertRecord',
	order: 96,
	options: [
		{
			displayName:
				'<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/search">Open official document</a>',
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
			displayName: 'Match Field Name',
			name: 'field_name',
			type: 'string',
			required: true,
			default: '',
			description: 'Field used to decide whether the record already exists',
		},
		{
			displayName: 'Match Field Value',
			name: 'field_value',
			type: 'string',
			required: true,
			default: '',
			description: 'Value compared against the match field',
		},
		{
			displayName: 'Fields',
			name: 'fields',
			type: 'json',
			required: true,
			default: '{}',
			description:
				'JSON object of field name to value. Keys are mapped to table field names automatically.',
		},
		{
			displayName: 'User ID Type',
			name: 'user_id_type',
			type: 'options',
			options: [
				{ name: 'Open ID', value: 'open_id' },
				{ name: 'Union ID', value: 'union_id' },
				{ name: 'User ID', value: 'user_id' },
			],
			default: 'open_id',
			description: 'ID type used in this request',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = this.getNodeParameter('app_token', index) as string;
		const table_id = this.getNodeParameter('table_id', index) as string;
		const field_name = this.getNodeParameter('field_name', index) as string;
		const field_value = this.getNodeParameter('field_value', index) as string;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const fields = NodeUtils.getNodeJsonData(this, 'fields', index, {}) as IDataObject;

		if (!fields || Object.keys(fields).length === 0) {
			throw new NodeOperationError(this.getNode(), 'Fields must contain at least one key');
		}

		const { data: searchData } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/search`,
			qs: { user_id_type },
			body: {
				filter: {
					conjunction: 'and',
					conditions: [
						{
							field_name,
							operator: 'is',
							value: [field_value],
						},
					],
				},
			},
		});

		const items = ((searchData as IDataObject)?.items as IDataObject[]) || [];
		if (items.length > 0) {
			const record_id = items[0].record_id as string;
			const { data } = await RequestUtils.request.call(this, {
				method: 'PUT',
				url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/${record_id}`,
				qs: { user_id_type },
				body: { fields },
			});
			return { action: 'updated', ...(data as IDataObject) };
		}

		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records`,
			qs: { user_id_type },
			body: { fields },
		});
		return { action: 'created', ...(data as IDataObject) };
	},
} as ResourceOperation;
