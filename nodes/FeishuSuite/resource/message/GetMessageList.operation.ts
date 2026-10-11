import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import { returnAllAndLimitOptions } from '../../../help/utils/options';
import { handlePagination } from '../../../help/utils/pagination';

export default {
	name: WORDING.GetMessageList,
	value: OperationType.GetMessageList,
	order: 206,
	options: [
		{
			displayName: 'Container ID Type (容器 ID 类型)',
			name: 'container_id_type',
			type: 'options',
			required: true,
			default: 'chat',
			options: [
				{ name: 'Chat (群聊)', value: 'chat' },
				{ name: 'Thread (话题)', value: 'thread' },
			],
		},
		{
			displayName: 'Container ID (容器 ID)',
			name: 'container_id',
			type: 'string',
			required: true,
			default: '',
			description: 'The chat_id or thread_id to fetch messages from',
		},
		{
			displayName: 'Start Time (开始时间)',
			name: 'start_time',
			type: 'dateTime',
			default: '',
			description: 'Start time for message filtering (optional)',
		},
		{
			displayName: 'End Time (结束时间)',
			name: 'end_time',
			type: 'dateTime',
			default: '',
			description: 'End time for message filtering (optional)',
		},
		{
			displayName: 'Sort Type (排序方式)',
			name: 'sort_type',
			type: 'options',
			default: 'ByCreateTimeDesc',
			options: [
				{ name: 'By Create Time Asc (按创建时间升序)', value: 'ByCreateTimeAsc' },
				{ name: 'By Create Time Desc (按创建时间降序)', value: 'ByCreateTimeDesc' },
			],
			description: 'Sort order for returned messages',
		},
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
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/list">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const containerIdType = this.getNodeParameter('container_id_type', index) as string;
		const containerId = this.getNodeParameter('container_id', index) as string;
		const startTime = this.getNodeParameter('start_time', index, '') as string;
		const endTime = this.getNodeParameter('end_time', index, '') as string;
		const sortType = this.getNodeParameter('sort_type', index, 'ByCreateTimeDesc') as string;
		const options = this.getNodeParameter('options', index, {}) as IDataObject;
		const user_id_type = (options.user_id_type as string) || 'open_id';

		const result = await handlePagination(
			this,
			index,
			async (pageToken?: string) => {
				const qs: IDataObject = {
					container_id_type: containerIdType,
					container_id: containerId,
					sort_type: sortType,
					user_id_type,
					page_size: 50,
				};
				if (startTime) {
					qs.start_time = Math.floor(new Date(startTime).getTime() / 1000).toString();
				}
				if (endTime) {
					qs.end_time = Math.floor(new Date(endTime).getTime() / 1000).toString();
				}
				if (pageToken) {
					qs.page_token = pageToken;
				}

				const { data } = await RequestUtils.request.call(this, {
					method: 'GET',
					url: '/open-apis/im/v1/messages',
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
