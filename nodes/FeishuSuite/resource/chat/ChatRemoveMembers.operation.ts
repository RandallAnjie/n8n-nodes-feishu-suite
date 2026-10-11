import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import { timeoutAndBatchingCollection } from '../../../help/utils/options';

export default {
	name: WORDING.RemoveChatMembers,
	value: OperationType.RemoveChatMembers,
	order: 91,
	options: [
		DESCRIPTIONS.CHAT_ID,
		{
			displayName: 'ID List (成员ID列表)',
			name: 'id_list',
			type: 'json',
			required: true,
			default: '[]',
			description: 'List of user/bot IDs to remove, in JSON array format',
		},
		DESCRIPTIONS.MEMBER_ID_TYPE,
		timeoutAndBatchingCollection,
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/im-v1/chat-member/delete">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const chat_id = this.getNodeParameter('chat_id', index) as string;
		const id_list = this.getNodeParameter('id_list', index, []) as string[];
		const member_id_type = this.getNodeParameter('member_id_type', index, 'open_id') as string;

		const { data } = await RequestUtils.request.call(this, {
			method: 'DELETE',
			url: `/open-apis/im/v1/chats/${chat_id}/members`,
			qs: {
				member_id_type,
			},
			body: {
				id_list,
			},
		});

		return data;
	},
} as ResourceOperation;
