import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Send Mail (发送邮件)',
	value: 'sendMail',
	order: 200,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/mail-v1/user_mailbox-message/send">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'User Mailbox ID',
			name: 'user_mailbox_id',
			type: 'string',
			default: 'me',
			description: 'Mailbox ID. Use me for the authorized user.',
		},
		{
			displayName: 'Request Body',
			name: 'body',
			type: 'json',
			default: '{}',
			description: 'JSON request body merged into the API call',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const user_mailbox_id = this.getNodeParameter('user_mailbox_id', index, 'me') as string;
		const body = NodeUtils.getNodeJsonData(this, 'body', index, {}) as IDataObject;
		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: `/open-apis/mail/v1/user_mailboxes/${user_mailbox_id}/messages/send`,
			body: { ...body },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
