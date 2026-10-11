import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Update User Group (更新用户组)',
	value: 'updateUserGroup',
	order: 64,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/contact-v3/group/patch">Open official document</a>',
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
			description: 'User group ID',
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
		const group_id = this.getNodeParameter('group_id', index, '') as string;
		const body = NodeUtils.getNodeJsonData(this, 'body', index, {}) as IDataObject;
		const { data } = await RequestUtils.request.call(this, {
			method: 'PATCH',
			url: `/open-apis/contact/v3/group/${group_id}`,
			body: { ...body },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
