import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Get Mail Group (获取邮件组)',
	value: 'getMailGroup',
	order: 160,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/mail-v1/mail-group/get">Open official document</a>',
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
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const mailgroup_id = this.getNodeParameter('mailgroup_id', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/mail/v1/mailgroups/${mailgroup_id}`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
