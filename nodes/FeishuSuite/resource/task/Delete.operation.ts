import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import { OperationType } from '../../../help/type/enums';
import RequestUtils from '../../../help/utils/RequestUtils';

export default {
	name: '删除任务（Delete Task）',
	value: OperationType.DeleteTask,
	order: 100,
	options: [
		{
			displayName: '任务ID（Task ID）',
			name: 'task_guid',
			type: 'string',
			required: true,
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const task_guid = this.getNodeParameter('task_guid', index) as string;

		const { code, msg } = await RequestUtils.request.call(this, {
			method: 'DELETE',
			url: `/open-apis/task/v2/tasks/${task_guid}`,
		});
		if (code !== 0) {
			throw new Error(`Delete task failed, code: ${code}, message: ${msg}`);
		}
		return {};
	},
} as ResourceOperation;
