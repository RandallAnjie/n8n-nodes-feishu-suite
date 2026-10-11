import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { timeoutAndBatchingCollection } from '../../../help/utils/options';

export default {
	name: WORDING.CreateChat,
	value: OperationType.CreateChat,
	order: 80,
	options: [
		{
			displayName: 'Name (群聊名称)',
			name: 'name',
			type: 'string',
			default: '',
			description: 'The name of the chat, 1-256 characters',
		},
		{
			displayName: 'Description (群聊描述)',
			name: 'description',
			type: 'string',
			typeOptions: {
				rows: 3,
			},
			default: '',
			description: 'The description of the chat',
		},
		{
			displayName: 'Chat Type (群聊类型)',
			name: 'chat_type',
			type: 'options',
			options: [
				{ name: 'Private (私有)', value: 'private' },
				{ name: 'Public (公开)', value: 'public' },
			],
			default: 'private',
		},
		{
			displayName: 'User ID List (用户ID列表)',
			name: 'user_id_list',
			type: 'json',
			default: '[]',
			description: 'List of user IDs to add to the chat initially, in JSON array format',
		},
		{
			displayName: 'Bot ID List (机器人ID列表)',
			name: 'bot_id_list',
			type: 'json',
			default: '[]',
			description: 'List of bot IDs to add to the chat initially, in JSON array format',
		},
		{
			displayName: 'Owner ID (群主ID)',
			name: 'owner_id',
			type: 'string',
			default: '',
			description: 'The owner of the chat, defaults to the operating user or bot',
		},
		timeoutAndBatchingCollection,
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/im-v1/chat/create">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const name = this.getNodeParameter('name', index) as string;
		const description = this.getNodeParameter('description', index, '') as string;
		const chat_type = this.getNodeParameter('chat_type', index, 'private') as string;
		const user_id_list = this.getNodeParameter('user_id_list', index, []) as string[];
		const bot_id_list = this.getNodeParameter('bot_id_list', index, []) as string[];
		const owner_id = this.getNodeParameter('owner_id', index, '') as string;

		const body: IDataObject = {};
		if (name) body.name = name;
		if (description) body.description = description;
		if (chat_type) body.chat_type = chat_type;
		if (user_id_list && user_id_list.length > 0) body.user_id_list = user_id_list;
		if (bot_id_list && bot_id_list.length > 0) body.bot_id_list = bot_id_list;
		if (owner_id) body.owner_id = owner_id;

		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/im/v1/chats',
			body,
		});

		return data;
	},
} as ResourceOperation;
