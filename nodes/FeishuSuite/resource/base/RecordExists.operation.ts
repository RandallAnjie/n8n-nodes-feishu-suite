import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Record Exists (判断记录是否存在)',
	value: 'recordExists',
	order: 94,
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
			description: 'Bitable app token.',
		},
		{
			displayName: 'Table ID',
			name: 'table_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Bitable table ID.',
		},
		{
			displayName: 'Field Name',
			name: 'field_name',
			type: 'string',
			required: true,
			default: '',
			description: 'Field used to look up an existing record.',
		},
		{
			displayName: 'Field Value',
			name: 'field_value',
			type: 'string',
			required: true,
			default: '',
			description: 'Value that must match for the record to be treated as existing.',
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
			description: 'ID type used in this request.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = this.getNodeParameter('app_token', index) as string;
		const table_id = this.getNodeParameter('table_id', index) as string;
		const field_name = this.getNodeParameter('field_name', index) as string;
		const field_value = this.getNodeParameter('field_value', index) as string;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;

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
