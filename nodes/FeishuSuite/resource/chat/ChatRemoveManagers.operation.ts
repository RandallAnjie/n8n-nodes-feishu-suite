import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import { timeoutAndBatchingCollection } from '../../../help/utils/options';

export default {
	name: WORDING.RemoveChatManagers,
	value: OperationType.RemoveChatManagers,
	order: 94,
	options: [
		DESCRIPTIONS.CHAT_ID,
		{
			displayName: 'Manager IDs (管理员ID列表)',
			name: 'manager_ids',
			type: 'json',
			required: true,
			default: '[]',
			description: 'List of user IDs to remove from managers, in JSON array format',
		},
		DESCRIPTIONS.MEMBER_ID_TYPE,
		timeoutAndBatchingCollection,
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/im-v1/chat-managers/delete_managers">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const chat_id = this.getNodeParameter('chat_id', index) as string;
		const manager_ids = this.getNodeParameter('manager_ids', index, []) as string[];
		const member_id_type = this.getNodeParameter('member_id_type', index, 'open_id') as string;

		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: `/open-apis/im/v1/chats/${chat_id}/managers/delete_managers`,
			qs: {
				member_id_type,
			},
			body: {
				manager_ids,
			},
		});

		return data;
	},
} as ResourceOperation;
