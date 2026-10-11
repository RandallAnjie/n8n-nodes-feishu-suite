import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import { timeoutAndBatchingCollection } from '../../../help/utils/options';

export default {
	name: WORDING.UpdateChat,
	value: OperationType.UpdateChat,
	order: 81,
	options: [
		DESCRIPTIONS.CHAT_ID,
		{
			displayName: 'Name (群聊名称)',
			name: 'name',
			type: 'string',
			default: '',
			description: 'The new name of the chat',
		},
		{
			displayName: 'Description (群聊描述)',
			name: 'description',
			type: 'string',
			typeOptions: {
				rows: 3,
			},
			default: '',
			description: 'The new description of the chat',
		},
		{
			displayName: 'I18n Names (多语言名称)',
			name: 'i18n_names',
			type: 'json',
			default: '{}',
			description: 'Internationalized names for the chat in JSON format',
		},
		{
			displayName: 'Owner ID (群主ID)',
			name: 'owner_id',
			type: 'string',
			default: '',
			description: 'The new owner of the chat, defaults to the current owner',
		},
		timeoutAndBatchingCollection,
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/im-v1/chat/update">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const chat_id = this.getNodeParameter('chat_id', index) as string;
		const name = this.getNodeParameter('name', index, '') as string;
		const description = this.getNodeParameter('description', index, '') as string;
		const i18n_names = this.getNodeParameter('i18n_names', index, {}) as IDataObject;
		const owner_id = this.getNodeParameter('owner_id', index, '') as string;

		const body: IDataObject = {};
		if (name) body.name = name;
		if (description) body.description = description;
		if (i18n_names && Object.keys(i18n_names).length > 0) body.i18n_names = i18n_names;
		if (owner_id) body.owner_id = owner_id;

		const { data } = await RequestUtils.request.call(this, {
			method: 'PUT',
			url: `/open-apis/im/v1/chats/${chat_id}`,
			body,
		});

		return data;
	},
} as ResourceOperation;
