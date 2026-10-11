import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Get Department (获取部门)',
	value: 'getDepartment',
	order: 72,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/contact-v3/department/get">Open official document</a>',
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
			description: 'Department ID to retrieve.',
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
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const department_id = this.getNodeParameter('department_id', index, '') as string;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/contact/v3/departments/${department_id}`,
			qs: { user_id_type },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
