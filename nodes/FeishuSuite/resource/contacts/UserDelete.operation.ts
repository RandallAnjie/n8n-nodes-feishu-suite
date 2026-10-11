import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Delete User (删除用户)',
	value: 'deleteUser',
	order: 86,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/contact-v3/user/delete">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'User ID',
			name: 'user_id',
			type: 'string',
			required: true,
			default: '',
			description: 'User ID to delete.',
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
		const user_id = this.getNodeParameter('user_id', index, '') as string;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'DELETE',
			url: `/open-apis/contact/v3/users/${user_id}`,
			qs: { user_id_type },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
