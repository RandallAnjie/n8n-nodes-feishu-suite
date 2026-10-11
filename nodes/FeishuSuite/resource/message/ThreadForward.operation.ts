import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import NodeUtils from '../../../help/utils/node';

export default {
	name: WORDING.ThreadForward,
	value: OperationType.ThreadForward,
	order: 207,
	options: [
		DESCRIPTIONS.RECEIVE_ID_TYPE,
		{
			...DESCRIPTIONS.MEMBER_ID,
			displayName: 'Receive ID (接收 ID)',
			name: 'receive_id',
		},
		DESCRIPTIONS.MESSAGE_TYPE,
		DESCRIPTIONS.MESSAGE_CONTENT,
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/thread/forward">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const receive_id_type = this.getNodeParameter('receive_id_type', index, 'open_id') as string;
		const receive_id = this.getNodeParameter('receive_id', index, undefined, {
			extractValue: true,
		}) as string;
		const msg_type = this.getNodeParameter('msg_type', index, 'text') as string;
		const content = NodeUtils.getObjectData(this, index, 'content');

		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/im/v1/threads/forward',
			qs: { receive_id_type },
			body: {
				receive_id,
				msg_type,
				content: JSON.stringify(content),
			},
		});

		return data;
	},
} as ResourceOperation;
