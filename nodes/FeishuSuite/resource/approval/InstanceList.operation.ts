import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import { handlePagination } from '../../../help/utils/pagination';

export default {
	name: 'List Approval Instances (列出审批实例)',
	value: 'listApprovalInstances',
	order: 170,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/approval-v4/instance/list">Open official document</a>',
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
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return every page of results.',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const approval_code = this.getNodeParameter('approval_code', index, '') as string;
		const result = await handlePagination(this, index, async (pageToken) => {
			const { data } = await RequestUtils.request.call(this, {
				method: 'GET',
				url: '/open-apis/approval/v4/instances',
				qs: {
					approval_code, page_size: 50,
					...(pageToken && { page_token: pageToken }),
				},
				
			});
			return data;
		}, 'instance_code_list');
		return {
			items: result.items,
			has_more: result.hasMore,
			page_token: result.pageToken ?? '',
		};
	},
} as ResourceOperation;
