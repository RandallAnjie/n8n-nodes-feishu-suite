import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Delete Mail Group Member (删除邮件组成员)',
	value: 'deleteMailGroupMember',
	order: 110,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/mail-v1/mail-group-member/delete">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Mail Group ID',
			name: 'mailgroup_id',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Member ID',
			name: 'member_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Mail group member ID',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const mailgroup_id = this.getNodeParameter('mailgroup_id', index, '') as string;
		const member_id = this.getNodeParameter('member_id', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'DELETE',
			url: `/open-apis/mail/v1/mailgroups/${mailgroup_id}/members/${member_id}`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
