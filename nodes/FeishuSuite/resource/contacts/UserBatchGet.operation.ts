import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Batch Get Users (批量获取用户)',
	value: 'batchGetUsers',
	order: 82,
	options: [
		{
			displayName:
				'<a target="_blank" href="https://open.feishu.cn/document/server-docs/contact-v3/user/batch">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'User IDs',
			name: 'user_ids',
			type: 'json',
			required: true,
			default: '[]',
			description: 'JSON array of user IDs to retrieve.',
		},
		{
			displayName: 'User ID Type',
			name: 'user_id_type',
			type: 'options',
			options: [
				{ name: 'Open ID', value: 'open_id' },
				{ name: 'Union ID', value: 'union_id' },
				{ name: 'User ID', value: 'user_id' },
			],
			default: 'open_id',
			description: 'ID type used in this request.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const user_ids = NodeUtils.getNodeJsonData(this, 'user_ids', index, []) as string[];
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: '/open-apis/contact/v3/users/batch',
			qs: {
				user_id_type,
				user_ids,
			},
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
