import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import {
	returnAllAndLimitOptions,
} from '../../../help/utils/options';

export default {
	name: WORDING.GetTableFieldList,
	value: OperationType.GetTableFieldList,
	order: 175,
	options: [
		DESCRIPTIONS.BASE_APP_TOKEN,
		DESCRIPTIONS.BASE_TABLE_ID,
		DESCRIPTIONS.TABLE_VIEW_ID,
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [
				...returnAllAndLimitOptions,
				DESCRIPTIONS.TEXT_FIELD_AS_ARRAY,
			],
		},
		{
			displayName: WORDING.Options,
			name: 'paginationOptions',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [
				DESCRIPTIONS.WHETHER_PAGING,
				DESCRIPTIONS.PAGE_TOKEN,
				DESCRIPTIONS.PAGE_SIZE,
			],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-field/list">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = this.getNodeParameter('app_token', index, undefined, {
			extractValue: true,
		}) as string;
		const table_id = this.getNodeParameter('table_id', index, undefined, {
			extractValue: true,
		}) as string;
		const view_id = this.getNodeParameter('view_id', index, undefined, {
			extractValue: true,
		}) as string;
		const options = this.getNodeParameter('options', index, {}) as IDataObject;
		const paginationOptions = this.getNodeParameter('paginationOptions', index, {}) as IDataObject;
		const whetherPaging = (paginationOptions.whether_paging as boolean) || false;
		let pageToken = (paginationOptions.page_token as string) || '';
		const pageSize = (paginationOptions.page_size as number) || 100;
		const returnAll = (options.returnAll as boolean) || false;
		const limit = (options.limit as number) || 100;
		const text_field_as_array = (options.text_field_as_array as boolean) || false;

		const allFields: IDataObject[] = [];
		let hasMore = false;
		do {
			const {
				data: { has_more, page_token, items },
			} = await RequestUtils.request.call(this, {
				method: 'GET',
				url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/fields`,
				qs: {
					text_field_as_array,
					...(view_id && { view_id }),
					page_token: pageToken,
					page_size: pageSize,
				},
			});

			hasMore = has_more;
			pageToken = page_token;
			if (items) {
				allFields.push(...items);
			}

			if (!returnAll && allFields.length >= limit) {
				hasMore = false;
				allFields.length = limit;
				break;
			}
		} while ((returnAll || !whetherPaging) && hasMore);

		return {
			has_more: hasMore,
			...(pageToken && { page_token: pageToken }),
			items: allFields,
		};
	},
} as ResourceOperation;
