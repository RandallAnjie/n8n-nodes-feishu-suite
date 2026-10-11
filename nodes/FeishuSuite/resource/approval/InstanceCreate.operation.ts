import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Create Approval Instance (创建审批实例)',
	value: 'createApprovalInstance',
	order: 190,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/approval-v4/instance/create">Open official document</a>',
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
			description: 'Approval definition code',
		},
		{
			displayName: 'Request Body',
			name: 'body',
			type: 'json',
			default: '{}',
			description: 'JSON request body merged into the API call',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const approval_code = this.getNodeParameter('approval_code', index, '') as string;
		const body = NodeUtils.getNodeJsonData(this, 'body', index, {}) as IDataObject;
		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/approval/v4/instances',
			body: { approval_code, ...body },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
