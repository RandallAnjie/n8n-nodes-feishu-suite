import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Create Mail Group (创建邮件组)',
	value: 'createMailGroup',
	order: 170,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/mail-v1/mail-group/create">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Request Body',
			name: 'body',
			type: 'json',
			default: '{}',
			description: 'JSON request body merged into the API call.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const body = NodeUtils.getNodeJsonData(this, 'body', index, {}) as IDataObject;
		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/mail/v1/mailgroups',
			body: { ...body },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
