import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';

export default {
	name: WORDING.SearchDepartment,
	value: OperationType.SearchDepartment,
	options: [
		{
			displayName: WORDING.SearchQuery,
			name: 'query',
			type: 'string',
			required: true,
			default: '',
			description: 'Search keyword for department name',
		},
		DESCRIPTIONS.WHETHER_PAGING,
		{
			...DESCRIPTIONS.PAGE_SIZE,
			typeOptions: {
				minValue: 1,
				maxValue: 50,
				numberPrecision: 0,
			},
			default: 50,
		},
		DESCRIPTIONS.PAGE_TOKEN,
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [DESCRIPTIONS.USER_ID_TYPE, DESCRIPTIONS.DEPARTMENT_ID_TYPE],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/contact-v3/department/search">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const query = this.getNodeParameter('query', index) as string;
		const whetherPaging = this.getNodeParameter('whether_paging', index, false) as boolean;
		let pageToken = this.getNodeParameter('page_token', index, '') as string;
		const pageSize = this.getNodeParameter('page_size', index, 50) as number;
		const options = this.getNodeParameter('options', index, {}) as IDataObject;
		const user_id_type = (options.user_id_type as string) || 'open_id';
		const department_id_type = (options.department_id_type as string) || 'open_department_id';

		const allItems: IDataObject[] = [];
		let hasMore = false;
		do {
			const {
				data: { has_more, page_token, items },
			} = await RequestUtils.request.call(this, {
				method: 'POST',
				url: '/open-apis/contact/v3/departments/search',
				qs: {
					user_id_type,
					department_id_type,
					page_size: pageSize,
					...(pageToken && { page_token: pageToken }),
				},
				body: {
					query,
				},
			});

			hasMore = has_more;
			pageToken = page_token;
			if (items) {
				allItems.push(...items);
			}
		} while (!whetherPaging && hasMore);

		return {
			has_more: hasMore,
			...(pageToken && { page_token: pageToken }),
			items: allItems,
		};
	},
} as ResourceOperation;
