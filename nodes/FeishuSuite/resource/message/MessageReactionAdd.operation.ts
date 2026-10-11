import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';

export default {
	name: WORDING.MessageReactionAdd,
	value: OperationType.MessageReactionAdd,
	order: 216,
	options: [
		DESCRIPTIONS.MESSAGE_ID,
		{
			displayName: 'Emoji Type (表情类型)',
			name: 'emoji_type',
			type: 'options',
			required: true,
			default: 'THUMBSUP',
			options: [
				{ name: '-1', value: 'MINUS_ONE' },
				{ name: '+1', value: 'PLUS_ONE' },
				{ name: '100', value: 'HUNDRED_POINTS' },
				{ name: 'CHECK_MARK_BUTTON', value: 'CHECK_MARK_BUTTON' },
				{ name: 'CLAP', value: 'CLAP' },
				{ name: 'CROSS_MARK_BUTTON', value: 'CROSS_MARK_BUTTON' },
				{ name: 'CRY', value: 'CRY' },
				{ name: 'FLEXED_BICEPS', value: 'FLEXED_BICEPS' },
				{ name: 'HEART', value: 'HEART' },
				{ name: 'HEART_ON_FIRE', value: 'HEART_ON_FIRE' },
				{ name: 'HUG', value: 'HUG' },
				{ name: 'LAUGH', value: 'LAUGH' },
				{ name: 'OK', value: 'OK' },
				{ name: 'PRAY', value: 'PRAY' },
				{ name: 'ROCKET', value: 'ROCKET' },
				{ name: 'SMILE', value: 'SMILE' },
				{ name: 'SURPRISE', value: 'SURPRISE' },
				{ name: 'THUMBSDOWN', value: 'THUMBSDOWN' },
				{ name: 'THUMBSUP', value: 'THUMBSUP' },
			],
			description: 'The emoji type to add as a reaction',
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message-reaction/create">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const message_id = this.getNodeParameter('message_id', index) as string;
		const emoji_type = this.getNodeParameter('emoji_type', index) as string;

		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: `/open-apis/im/v1/messages/${message_id}/reactions`,
			body: {
				reaction_type: { emoji_type },
			},
		});

		return data;
	},
} as ResourceOperation;
