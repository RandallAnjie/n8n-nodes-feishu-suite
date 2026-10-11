import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Delete Department (删除部门)',
	value: 'deleteDepartment',
	order: 74,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/contact-v3/department/delete">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Department ID',
			name: 'department_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Department ID to delete.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const department_id = this.getNodeParameter('department_id', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'DELETE',
			url: `/open-apis/contact/v3/departments/${department_id}`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
