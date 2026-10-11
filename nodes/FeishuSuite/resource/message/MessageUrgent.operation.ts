import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import NodeUtils from '../../../help/utils/node';

export default {
	name: WORDING.MessageUrgent,
	value: OperationType.MessageUrgent,
	order: 210,
	options: [
		DESCRIPTIONS.MESSAGE_ID,
		{
			displayName: 'User ID List (用户 ID 列表)',
			name: 'user_id_list',
			type: 'json',
			required: true,
			default: '[]',
			description: 'List of user IDs to mark the message as urgent for, e.g. ["userId1", "userId2"]',
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/urgent_app">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const message_id = this.getNodeParameter('message_id', index) as string;
		const user_id_list = NodeUtils.getObjectData(this, index, 'user_id_list');

		const { data } = await RequestUtils.request.call(this, {
			method: 'PATCH',
			url: `/open-apis/im/v1/messages/${message_id}/urgent_app`,
			body: { user_id_list },
		});

		return data;
	},
} as ResourceOperation;
