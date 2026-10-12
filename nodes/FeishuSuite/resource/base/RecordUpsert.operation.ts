import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { DESCRIPTIONS } from '../../../help/description';
import { WORDING } from '../../../help/wording';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Upsert Record (更新或新建记录)',
	value: 'upsertRecord',
	order: 96,
	options: [
		DESCRIPTIONS.BASE_APP_TOKEN,
		DESCRIPTIONS.BASE_TABLE_ID,
		{
			displayName: 'Match Field Name (匹配字段名称)',
			name: 'field_name',
			type: 'string',
			required: true,
			default: '',
			description:
				'Field *name* (字段名称), not field_id. Used to decide whether the record already exists.',
		},
		{
			displayName: 'Match Field Value (匹配字段值)',
			name: 'field_value',
			type: 'string',
			required: true,
			default: '',
			description: 'Value compared against the match field',
		},
		{
			displayName: 'Fields (字段值 JSON)',
			name: 'fields',
			type: 'json',
			required: true,
			default: '{}',
			description:
				'JSON object of field *name* to value. Keys are field names, not field IDs. Date values are Unix milliseconds.',
		},
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [DESCRIPTIONS.USER_ID_TYPE],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/search">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = NodeUtils.getResourceId(this, 'app_token', index);
		const table_id = NodeUtils.getResourceId(this, 'table_id', index);
		const field_name = this.getNodeParameter('field_name', index) as string;
		const field_value = this.getNodeParameter('field_value', index) as string;
		const options = this.getNodeParameter('options', index, {}) as IDataObject;
		const user_id_type = (options.user_id_type as string) || 'open_id';
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
