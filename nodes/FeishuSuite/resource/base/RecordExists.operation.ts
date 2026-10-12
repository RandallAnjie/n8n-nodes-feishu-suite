import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { DESCRIPTIONS } from '../../../help/description';
import { WORDING } from '../../../help/wording';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Record Exists (判断记录是否存在)',
	value: 'recordExists',
	order: 94,
	options: [
		DESCRIPTIONS.BASE_APP_TOKEN,
		DESCRIPTIONS.BASE_TABLE_ID,
		{
			displayName: 'Field Name (字段名称)',
			name: 'field_name',
			type: 'string',
			required: true,
			default: '',
			description: 'Field *name* (字段名称), not field_id',
		},
		{
			displayName: 'Field Value (字段值)',
			name: 'field_value',
			type: 'string',
			required: true,
			default: '',
			description: 'Value that must match for the record to be treated as existing',
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

		const { data } = await RequestUtils.request.call(this, {
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
				automatic_fields: false,
			},
		});

		const items = ((data as IDataObject)?.items as IDataObject[]) || [];
		return {
			exists: items.length > 0,
			count: items.length,
			records: items,
		};
	},
} as ResourceOperation;
