import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Query Attendance Stats (查询考勤统计)',
	value: 'queryAttendanceUserStats',
	order: 160,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/attendance-v1/user_stats_data/query">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
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
			description: 'ID type of employees in the request.',
		},
		{
			displayName: 'Request Body',
			name: 'body',
			type: 'json',
			default: '{}',
			description: 'JSON request body merged into the API call.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const employee_type = this.getNodeParameter('employee_type', index, 'employee_id') as string;
		const body = NodeUtils.getNodeJsonData(this, 'body', index, {}) as IDataObject;
		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/attendance/v1/user_stats_datas/query',
			qs: { employee_type },
			body: { ...body },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
