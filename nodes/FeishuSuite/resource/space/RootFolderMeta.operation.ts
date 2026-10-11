import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Get Root Folder Meta (获取根文件夹元数据)',
	value: 'getRootFolderMeta',
	order: 135,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/drive-v1/folder/get-root-folder-meta">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {

		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: '/open-apis/drive/explorer/v2/root_folder/meta',
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
