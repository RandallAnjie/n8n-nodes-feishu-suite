import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import { timeoutAndBatchingCollection } from '../../../help/utils/options';

export default {
	name: WORDING.DeleteChatTopNotice,
	value: OperationType.DeleteChatTopNotice,
	order: 88,
	options: [
		DESCRIPTIONS.CHAT_ID,
		timeoutAndBatchingCollection,
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/im-v1/chat/top_notice/delete_top_notice">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const chat_id = this.getNodeParameter('chat_id', index) as string;

		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: `/open-apis/im/v1/chats/${chat_id}/top_notice/delete_top_notice`,
		});

		return data;
	},
} as ResourceOperation;
