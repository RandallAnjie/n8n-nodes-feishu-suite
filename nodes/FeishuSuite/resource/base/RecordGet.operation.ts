import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Get Record (获取记录)',
	value: 'getRecord',
	order: 95,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/get">Open official document</a>',
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
			displayName: 'Record ID',
			name: 'record_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Record ID to retrieve',
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
		const app_token = this.getNodeParameter('app_token', index, '') as string;
		const table_id = this.getNodeParameter('table_id', index, '') as string;
		const record_id = this.getNodeParameter('record_id', index, '') as string;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/${record_id}`,
			qs: { user_id_type },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
