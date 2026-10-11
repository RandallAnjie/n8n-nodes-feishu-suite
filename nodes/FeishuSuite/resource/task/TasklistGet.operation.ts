import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Get Tasklist (获取清单)',
	value: 'getTasklist',
	order: 88,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/task-v2/tasklist/get">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Tasklist GUID',
			name: 'tasklist_guid',
			type: 'string',
			required: true,
			default: '',
			description: 'Tasklist GUID.',
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
		const tasklist_guid = this.getNodeParameter('tasklist_guid', index, '') as string;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/task/v2/tasklists/${tasklist_guid}`,
			qs: { user_id_type },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
