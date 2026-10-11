import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';

export default {
	name: WORDING.GetDepartmentChildren,
	value: OperationType.GetDepartmentChildren,
	options: [
		{
			displayName: WORDING.DepartmentId,
			name: 'department_id',
			type: 'string',
			default: '0',
			description: 'Department ID, 0 for root department',
		},
		{
			displayName: 'Fetch Child Departments',
			name: 'fetch_child',
			type: 'boolean',
			default: false,
			description: 'Whether to recursively fetch child departments',
		},
		DESCRIPTIONS.USER_ID_TYPE,
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
			options: [DESCRIPTIONS.DEPARTMENT_ID_TYPE],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/contact-v3/department/children">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const department_id = this.getNodeParameter('department_id', index, '0') as string;
		const fetch_child = this.getNodeParameter('fetch_child', index, false) as boolean;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const whetherPaging = this.getNodeParameter('whether_paging', index, false) as boolean;
		let pageToken = this.getNodeParameter('page_token', index, '') as string;
		const pageSize = this.getNodeParameter('page_size', index, 50) as number;
		const options = this.getNodeParameter('options', index, {}) as IDataObject;
		const department_id_type = (options.department_id_type as string) || 'open_department_id';

		const allItems: IDataObject[] = [];
		let hasMore = false;
		do {
			const {
				data: { has_more, page_token, items },
			} = await RequestUtils.request.call(this, {
				method: 'GET',
				url: `/open-apis/contact/v3/departments/${department_id}/children`,
				qs: {
					department_id_type,
					...(user_id_type && { user_id_type }),
					...(fetch_child && { fetch_child }),
					page_size: pageSize,
					...(pageToken && { page_token: pageToken }),
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
