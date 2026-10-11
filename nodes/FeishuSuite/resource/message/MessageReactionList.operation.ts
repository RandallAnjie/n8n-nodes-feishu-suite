import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import { returnAllAndLimitOptions } from '../../../help/utils/options';
import { handlePagination } from '../../../help/utils/pagination';

export default {
	name: WORDING.MessageReactionList,
	value: OperationType.MessageReactionList,
	order: 217,
	options: [
		DESCRIPTIONS.MESSAGE_ID,
		...returnAllAndLimitOptions,
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [DESCRIPTIONS.USER_ID_TYPE],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message-reaction/list">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const message_id = this.getNodeParameter('message_id', index) as string;
		const options = this.getNodeParameter('options', index, {}) as IDataObject;
		const user_id_type = (options.user_id_type as string) || 'open_id';

		const result = await handlePagination(
			this,
			index,
			async (pageToken?: string) => {
				const qs: IDataObject = { user_id_type, page_size: 50 };
				if (pageToken) {
					qs.page_token = pageToken;
				}

				const { data } = await RequestUtils.request.call(this, {
					method: 'GET',
					url: `/open-apis/im/v1/messages/${message_id}/reactions`,
					qs,
				});
				return data as IDataObject;
			},
			'items',
		);

		return {
			items: result.items,
			has_more: result.hasMore,
			page_token: result.pageToken ?? '',
		};
	},
} as ResourceOperation;
