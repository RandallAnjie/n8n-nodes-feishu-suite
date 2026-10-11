import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';

export default {
	name: WORDING.MessagePin,
	value: OperationType.MessagePin,
	order: 219,
	options: [
		DESCRIPTIONS.MESSAGE_ID,
		{
			displayName: 'Chat ID (群聊 ID)',
			name: 'chat_id',
			type: 'string',
			default: '',
			description: 'The chat ID where the message belongs. Optional, can be empty.',
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/pin/create">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const message_id = this.getNodeParameter('message_id', index) as string;
		const chat_id = this.getNodeParameter('chat_id', index, '') as string;

		const body: IDataObject = { message_id };
		if (chat_id) {
			body.chat_id = chat_id;
		}

		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/im/v1/pins',
			body,
		});

		return data;
	},
} as ResourceOperation;
