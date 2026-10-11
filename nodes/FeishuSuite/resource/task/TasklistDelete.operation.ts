import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Delete Tasklist (删除清单)',
	value: 'deleteTasklist',
	order: 82,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/task-v2/tasklist/delete">Open official document</a>',
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
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const tasklist_guid = this.getNodeParameter('tasklist_guid', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'DELETE',
			url: `/open-apis/task/v2/tasklists/${tasklist_guid}`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
