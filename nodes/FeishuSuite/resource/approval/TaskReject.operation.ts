import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Reject Approval Task (拒绝审批任务)',
	value: 'rejectApprovalTask',
	order: 130,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/approval-v4/task/approve">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Approval Code',
			name: 'approval_code',
			type: 'string',
			required: true,
			default: '',
			description: 'Approval definition code',
		},
		{
			displayName: 'Instance Code',
			name: 'instance_code',
			type: 'string',
			required: true,
			default: '',
			description: 'Approval instance code',
		},
		{
			displayName: 'User ID',
			name: 'user_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Task operator user ID',
		},
		{
			displayName: 'Task ID',
			name: 'task_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Approval task ID from instance task_list',
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
		{
			displayName: 'Request Body',
			name: 'body',
			type: 'json',
			default: '{}',
			description: 'JSON request body merged into the API call',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const approval_code = this.getNodeParameter('approval_code', index, '') as string;
		const instance_code = this.getNodeParameter('instance_code', index, '') as string;
		const user_id = this.getNodeParameter('user_id', index, '') as string;
		const task_id = this.getNodeParameter('task_id', index, '') as string;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const body = NodeUtils.getNodeJsonData(this, 'body', index, {}) as IDataObject;
		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/approval/v4/tasks/reject',
			qs: { user_id_type },
			body: { approval_code, instance_code, user_id, task_id, ...body },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
