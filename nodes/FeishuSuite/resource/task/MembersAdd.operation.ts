import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import { OperationType } from '../../../help/type/enums';
import NodeUtils from '../../../help/utils/node';
import RequestUtils from '../../../help/utils/RequestUtils';

const REQUEST_BODY = [
	{
		id: '',
		role: 'assignee',
		type: 'user',
		name: '',
	},
];

export default {
	name: '添加任务成员（Add Members）',
	value: OperationType.AddTaskMembers,
	order: 90,
	options: [
		{
			displayName: '任务ID（Task ID）',
			name: 'task_guid',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: '用户 ID 类型（User ID Type）',
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
			displayName: '幂等Token（Client Token）',
			name: 'client_token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Idempotent token',
		},
		{
			displayName: '成员（Members）',
			name: 'members',
			type: 'json',
			required: true,
			default: JSON.stringify(REQUEST_BODY),
			description: 'Https://open.feishu.cn/document/task-v2/task/add_members#requestBody',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const task_guid = this.getNodeParameter('task_guid', index) as string;
		const user_id_type = this.getNodeParameter('user_id_type', index) as string;
		const members = NodeUtils.getNodeJsonData(this, 'members', index) as IDataObject[];
		const client_token = this.getNodeParameter('client_token', index, '') as string;

		const {
			code,
			msg,
			data: { task },
		} = await RequestUtils.request.call(this, {
			method: 'POST',
			url: `/open-apis/task/v2/tasks/${task_guid}/add_members`,
			qs: {
				user_id_type: user_id_type,
			},
			body: {
				members,
				...(client_token && { client_token }),
			},
		});
		if (code !== 0) {
			throw new Error(`Add task members failed, code: ${code}, message: ${msg}`);
		}
		return task as IDataObject;
	},
} as ResourceOperation;
