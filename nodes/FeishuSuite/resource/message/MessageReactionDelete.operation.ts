import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';

export default {
	name: WORDING.MessageReactionDelete,
	value: OperationType.MessageReactionDelete,
	order: 218,
	options: [
		DESCRIPTIONS.MESSAGE_ID,
		{
			displayName: 'Reaction ID (表情回复 ID)',
			name: 'reaction_id',
			type: 'string',
			required: true,
			default: '',
			description: 'The reaction_id to delete',
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message-reaction/delete">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const message_id = this.getNodeParameter('message_id', index) as string;
		const reaction_id = this.getNodeParameter('reaction_id', index) as string;

		await RequestUtils.request.call(this, {
			method: 'DELETE',
			url: `/open-apis/im/v1/messages/${message_id}/reactions/${reaction_id}`,
		});

		return {
			deleted: true,
			message_id,
			reaction_id,
		};
	},
} as ResourceOperation;
