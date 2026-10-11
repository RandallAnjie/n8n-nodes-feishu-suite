import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Get Mail Message (获取邮件)',
	value: 'getMailMessage',
	order: 180,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/mail-v1/user_mailbox-message/get">Open official document</a>',
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
			displayName: 'Message ID',
			name: 'message_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Mail message ID',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const user_mailbox_id = this.getNodeParameter('user_mailbox_id', index, 'me') as string;
		const message_id = this.getNodeParameter('message_id', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/mail/v1/user_mailboxes/${user_mailbox_id}/messages/${message_id}`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
