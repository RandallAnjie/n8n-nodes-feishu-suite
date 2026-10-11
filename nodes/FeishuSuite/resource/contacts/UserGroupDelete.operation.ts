import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Delete User Group (删除用户组)',
	value: 'deleteUserGroup',
	order: 62,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/contact-v3/group/delete">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Group ID',
			name: 'group_id',
			type: 'string',
			required: true,
			default: '',
			description: 'User group ID.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const group_id = this.getNodeParameter('group_id', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'DELETE',
			url: `/open-apis/contact/v3/group/${group_id}`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
