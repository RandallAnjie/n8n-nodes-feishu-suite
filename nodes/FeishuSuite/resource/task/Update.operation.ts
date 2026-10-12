import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import { OperationType } from '../../../help/type/enums';
import NodeUtils from '../../../help/utils/node';
import RequestUtils from '../../../help/utils/RequestUtils';

export default {
	name: '更新任务（Update Task）',
	value: OperationType.UpdateTask,
	order: 100,
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
			displayName: '请求体（Request Body）',
			name: 'body',
			type: 'json',
			required: true,
			default: '{"task":{"summary":""},"update_fields":["summary"]}',
			description:
				'Must include update_fields (the names of fields being changed) plus task. Example: {"task":{"summary":"new title"},"update_fields":["summary"]}. See https://open.feishu.cn/document/task-v2/task/patch',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const task_guid = this.getNodeParameter('task_guid', index) as string;
		const user_id_type = this.getNodeParameter('user_id_type', index) as string;
		const body = NodeUtils.getNodeJsonData(this, 'body', index) as IDataObject;

		const {
			code,
			msg,
			data: { task },
		} = await RequestUtils.request.call(this, {
			method: 'PATCH',
			url: `/open-apis/task/v2/tasks/${task_guid}`,
			qs: {
				user_id_type: user_id_type,
			},
			body: body,
		});
		if (code !== 0) {
			throw new Error(`Update task failed, code: ${code}, message: ${msg}`);
		}
		return task as IDataObject;
	},
} as ResourceOperation;
