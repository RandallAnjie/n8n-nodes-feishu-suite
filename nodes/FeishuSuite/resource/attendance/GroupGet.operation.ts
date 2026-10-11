import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Get Attendance Group (获取考勤组)',
	value: 'getAttendanceGroup',
	order: 190,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/attendance-v1/group/get">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Group ID',
			name: 'group_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Attendance group ID.',
		},
		{
			displayName: 'Employee Type',
			name: 'employee_type',
			type: 'options',
			options: [
				{ name: 'Employee ID', value: 'employee_id' },
				{ name: 'Employee No', value: 'employee_no' },
			],
			default: 'employee_id',
			description: 'ID type of employees in the response.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const group_id = this.getNodeParameter('group_id', index, '') as string;
		const employee_type = this.getNodeParameter('employee_type', index, 'employee_id') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/attendance/v1/groups/${group_id}`,
			qs: { employee_type },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
