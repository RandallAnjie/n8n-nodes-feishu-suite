import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Create Task Comment (创建任务评论)',
	value: 'createTaskComment',
	order: 74,
	options: [
		{
			displayName:
				'<a target="_blank" href="https://open.feishu.cn/document/task-v2/comment/create">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Task GUID (任务 ID)',
			name: 'task_guid',
			type: 'string',
			required: true,
			default: '',
			description: 'Task GUID to comment on (resource_id of type task)',
		},
		{
			displayName: 'Content (评论内容)',
			name: 'content',
			type: 'string',
			required: true,
			default: '',
			typeOptions: { rows: 3 },
			description: 'Plain-text comment body',
		},
		{
			displayName: 'User ID Type (用户 ID 类型)',
			name: 'user_id_type',
			type: 'options',
			options: [
				{ name: 'Open ID', value: 'open_id' },
				{ name: 'Union ID', value: 'union_id' },
				{ name: 'User ID', value: 'user_id' },
			],
			default: 'open_id',
		},
		{
			displayName: 'Extra Body (额外请求体)',
			name: 'body',
			type: 'json',
			default: '{}',
			description: 'Optional JSON merged into the API body (reply_to_comment_id, etc.)',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const task_guid = this.getNodeParameter('task_guid', index) as string;
		const content = this.getNodeParameter('content', index, '') as string;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const extra = NodeUtils.getOptionalJsonObject(this, 'body', index) || {};
		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/task/v2/comments',
			qs: { user_id_type },
			body: { task_guid, content, ...extra },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
