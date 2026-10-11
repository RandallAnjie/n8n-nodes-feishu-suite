import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Add Mail Group Member (添加邮件组成员)',
	value: 'addMailGroupMember',
	order: 130,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/mail-v1/mail-group-member/create">Open official document</a>',
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
			displayName: 'Request Body',
			name: 'body',
			type: 'json',
			default: '{}',
			description: 'JSON request body merged into the API call',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const mailgroup_id = this.getNodeParameter('mailgroup_id', index, '') as string;
		const body = NodeUtils.getNodeJsonData(this, 'body', index, {}) as IDataObject;
		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: `/open-apis/mail/v1/mailgroups/${mailgroup_id}/members`,
			body: { ...body },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
