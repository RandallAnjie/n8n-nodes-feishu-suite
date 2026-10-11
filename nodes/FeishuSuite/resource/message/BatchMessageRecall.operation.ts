import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';

export default {
	name: WORDING.BatchMessageRecall,
	value: OperationType.BatchMessageRecall,
	order: 212,
	options: [
		{
			displayName: 'Batch Message ID (批量消息 ID)',
			name: 'batch_message_id',
			type: 'string',
			required: true,
			default: '',
			description: 'The batch_message_id returned when sending batch messages',
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/im-v1/batch_message/recall-batch-messages">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const batch_message_id = this.getNodeParameter('batch_message_id', index) as string;

		await RequestUtils.request.call(this, {
			method: 'PATCH',
			url: `/open-apis/im/v1/batch_messages/${batch_message_id}`,
		});

		return {
			recalled: true,
			batch_message_id,
		};
	},
} as ResourceOperation;
