import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';

export default {
	name: WORDING.BatchMessageProgress,
	value: OperationType.BatchMessageProgress,
	order: 213,
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
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/im-v1/batch_message/query-batch-message-progress">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const batch_message_id = this.getNodeParameter('batch_message_id', index) as string;

		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/im/v1/batch_messages/${batch_message_id}`,
		});

		return data;
	},
} as ResourceOperation;
