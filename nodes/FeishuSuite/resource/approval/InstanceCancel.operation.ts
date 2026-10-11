import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Cancel Approval Instance (撤回审批实例)',
	value: 'cancelApprovalInstance',
	order: 160,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/approval-v4/instance/cancel">Open official document</a>',
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
			description: 'Approval definition code.',
		},
		{
			displayName: 'Instance Code',
			name: 'instance_code',
			type: 'string',
			required: true,
			default: '',
			description: 'Approval instance code.',
		},
		{
			displayName: 'User ID',
			name: 'user_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Operator user ID matching the selected ID type.',
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
		const approval_code = this.getNodeParameter('approval_code', index, '') as string;
		const instance_code = this.getNodeParameter('instance_code', index, '') as string;
		const user_id = this.getNodeParameter('user_id', index, '') as string;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/approval/v4/instances/cancel',
			qs: { user_id_type },
			body: { approval_code, instance_code, user_id },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
