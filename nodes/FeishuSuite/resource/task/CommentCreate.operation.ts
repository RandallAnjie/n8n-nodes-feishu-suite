import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Create Task Comment (创建任务评论)',
	value: 'createTaskComment',
	order: 74,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/task-v2/comment/create">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
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
		{
			displayName: 'Request Body',
			name: 'body',
			type: 'json',
			default: '{}',
			description: 'JSON request body merged into the API call.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const body = NodeUtils.getNodeJsonData(this, 'body', index, {}) as IDataObject;
		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/task/v2/comments',
			qs: { user_id_type },
			body: { ...body },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
