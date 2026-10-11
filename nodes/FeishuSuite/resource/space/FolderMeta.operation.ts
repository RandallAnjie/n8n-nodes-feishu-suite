import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Get Folder Meta (获取文件夹元数据)',
	value: 'getFolderMeta',
	order: 140,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/drive-v1/folder/get-folder-meta">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Folder Token',
			name: 'folder_token',
			type: 'string',
			required: true,
			typeOptions: { password: true },
			default: '',
			description: 'Cloud folder token',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const folder_token = this.getNodeParameter('folder_token', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/drive/explorer/v2/folder/${folder_token}/meta`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
