import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import FormData from 'form-data';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Upload Aily File (上传文件)',
	value: 'ailyUploadFile',
	order: 20,
	options: [
		{
			displayName:
				'<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/aily-v1/file/create">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Binary Field',
			name: 'file_binary_field',
			type: 'string',
			required: true,
			default: 'data',
			description: 'Name of the incoming binary property that contains the file',
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
		const file_binary_field = this.getNodeParameter('file_binary_field', index) as string;
		const overrideName = this.getNodeParameter('file_name', index, '') as string;
		const binaryData = await this.helpers.assertBinaryData(index, file_binary_field);
		const buffer = await this.helpers.getBinaryDataBuffer(index, file_binary_field);
		const file_name = overrideName || binaryData.fileName;
		if (!file_name) {
			throw new NodeOperationError(this.getNode(), 'File name is required');
		}
		const formData = new FormData();
		formData.append('file', buffer, {
			filename: file_name,
			contentType: binaryData.mimeType || 'application/octet-stream',
		});
		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/aily/v1/files',
			body: formData,
			json: true,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
