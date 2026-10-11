import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Delete Task Comment (删除任务评论)',
	value: 'deleteTaskComment',
	order: 70,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/task-v2/comment/delete">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Comment ID',
			name: 'comment_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Comment ID to delete.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const comment_id = this.getNodeParameter('comment_id', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'DELETE',
			url: `/open-apis/task/v2/comments/${comment_id}`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
