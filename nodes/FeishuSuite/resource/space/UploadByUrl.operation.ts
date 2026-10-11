import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import FormData from 'form-data';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Upload File By URL (通过 URL 上传文件)',
	value: 'uploadFileByUrl',
	order: 115,
	options: [
		{
			displayName:
				'<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/drive-v1/upload/upload-all">Open official document</a>',
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
			description: 'Destination folder token',
		},
		{
			displayName: 'File URL',
			name: 'file_url',
			type: 'string',
			required: true,
			default: '',
			description: 'HTTP URL of the file to download and upload',
		},
		{
			displayName: 'File Name',
			name: 'file_name',
			type: 'string',
			default: '',
			description: 'Optional override for the uploaded file name',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const folder_token = this.getNodeParameter('folder_token', index) as string;
		const file_url = this.getNodeParameter('file_url', index) as string;
		const file_name = this.getNodeParameter('file_name', index, '') as string;
		const response = await this.helpers.httpRequest({
			method: 'GET',
			url: file_url,
			encoding: 'arraybuffer',
			json: false,
		});
		const buffer = Buffer.from(response as ArrayBuffer);
		if (!buffer.length) {
			throw new NodeOperationError(this.getNode(), 'Downloaded file is empty');
		}
		const name = file_name || decodeURIComponent(file_url.split('/').pop()?.split('?')[0] || 'upload.bin');
		const formData = new FormData();
		formData.append('file_name', name);
		formData.append('parent_type', 'explorer');
		formData.append('parent_node', folder_token);
		formData.append('size', buffer.length);
		formData.append('file', buffer, { filename: name });

		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/drive/v1/files/upload_all',
			body: formData,
			json: true,
		});
		return data as IDataObject;
	},
} as ResourceOperation;
