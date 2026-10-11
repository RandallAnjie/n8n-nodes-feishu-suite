import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Delete Mail Group (删除邮件组)',
	value: 'deleteMailGroup',
	order: 140,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/mail-v1/mail-group/delete">Open official document</a>',
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
			method: 'DELETE',
			url: `/open-apis/mail/v1/mailgroups/${mailgroup_id}`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
