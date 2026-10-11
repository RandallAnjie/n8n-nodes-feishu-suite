import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import NodeUtils from '../../../help/utils/node';

export default {
	name: WORDING.BatchMessageSend,
	value: OperationType.BatchMessageSend,
	order: 211,
	options: [
		DESCRIPTIONS.RECEIVE_ID_TYPE,
		{
			displayName: 'User IDs (用户 ID 列表)',
			name: 'user_ids',
			type: 'json',
			required: true,
			default: '[]',
			description: 'List of user IDs to send batch messages to, e.g. ["userId1", "userId2"]',
		},
		DESCRIPTIONS.MESSAGE_TYPE,
		DESCRIPTIONS.MESSAGE_CONTENT,
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [
				{
					displayName: 'Department IDs (部门 ID 列表)',
					name: 'department_ids',
					type: 'json',
					default: '[]',
					description: 'List of department IDs to send batch messages to',
				},
				DESCRIPTIONS.REQUEST_ID,
			],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/im-v1/batch_message/send-messages-in-batches">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const receive_id_type = this.getNodeParameter('receive_id_type', index, 'open_id') as string;
		const user_ids = NodeUtils.getObjectData(this, index, 'user_ids');
		const msg_type = this.getNodeParameter('msg_type', index, 'text') as string;
		const content = NodeUtils.getObjectData(this, index, 'content');
		const options = this.getNodeParameter('options', index, {}) as IDataObject;
		const department_ids = NodeUtils.getObjectData(this, index, 'options.department_ids', []);
		const uuid = options.request_id as string | undefined;

		const body: IDataObject = {
			user_ids,
			msg_type,
			content: JSON.stringify(content),
		};

		if (Array.isArray(department_ids) && department_ids.length > 0) {
			body.department_ids = department_ids;
		}

		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/im/v1/batch_messages',
			qs: { receive_id_type, ...(uuid && { uuid }) },
			body,
		});

		return data;
	},
} as ResourceOperation;
