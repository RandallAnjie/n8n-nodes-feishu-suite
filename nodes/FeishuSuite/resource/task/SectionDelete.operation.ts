import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Delete Task Section (删除任务分组)',
	value: 'deleteTaskSection',
	order: 64,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/task-v2/section/delete">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Section GUID',
			name: 'section_guid',
			type: 'string',
			required: true,
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const section_guid = this.getNodeParameter('section_guid', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'DELETE',
			url: `/open-apis/task/v2/sections/${section_guid}`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
