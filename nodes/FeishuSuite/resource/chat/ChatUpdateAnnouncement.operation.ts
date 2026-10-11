import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import { timeoutAndBatchingCollection } from '../../../help/utils/options';

export default {
	name: WORDING.UpdateChatAnnouncement,
	value: OperationType.UpdateChatAnnouncement,
	order: 85,
	options: [
		DESCRIPTIONS.CHAT_ID,
		{
			displayName: 'Revision (版本号)',
			name: 'revision',
			type: 'string',
			required: true,
			default: '',
			description: 'The revision of the announcement, used to prevent concurrent update conflicts',
		},
		{
			displayName: 'Announcement Requests (公告内容)',
			name: 'requests',
			type: 'json',
			default: '[]',
			description: 'Array of announcement content strings, in JSON format like ["content1", "content2"]',
		},
		{
			displayName: 'Announcement Docs (公告文档)',
			name: 'request_docs',
			type: 'json',
			default: '[]',
			description: 'Array of announcement document objects, in JSON format',
		},
		timeoutAndBatchingCollection,
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/im-v1/chat/announcement/patch">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const chat_id = this.getNodeParameter('chat_id', index) as string;
		const revision = this.getNodeParameter('revision', index, '') as string;
		const requests = this.getNodeParameter('requests', index, []) as string[];
		const request_docs = this.getNodeParameter('request_docs', index, []) as IDataObject[];

		const body: IDataObject = {};
		if (revision) body.revision = revision;
		if (requests && requests.length > 0) body.requests = requests;
		if (request_docs && request_docs.length > 0) body.request_docs = request_docs;

		const { data } = await RequestUtils.request.call(this, {
			method: 'PATCH',
			url: `/open-apis/im/v1/chats/${chat_id}/announcement`,
			body,
		});

		return data;
	},
} as ResourceOperation;
