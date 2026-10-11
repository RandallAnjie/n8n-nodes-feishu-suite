import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import { handlePagination } from '../../../help/utils/pagination';

export default {
	name: 'List Aily Skills (查询技能列表)',
	value: 'ailyListSkills',
	order: 40,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/aily-v1/skill/list">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Aily App ID',
			name: 'app_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Aily application ID, for example spring_xxx__c.',
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
		const app_id = this.getNodeParameter('app_id', index, '') as string;
		const result = await handlePagination(this, index, async (pageToken) => {
			const { data } = await RequestUtils.request.call(this, {
				method: 'GET',
				url: `/open-apis/aily/v1/apps/${app_id}/skills`,
				qs: {
					page_size: 50,
					...(pageToken && { page_token: pageToken }),
				},
				
			});
			return data;
		}, 'skills');
		return {
			items: result.items,
			has_more: result.hasMore,
			page_token: result.pageToken ?? '',
		};
	},
} as ResourceOperation;
