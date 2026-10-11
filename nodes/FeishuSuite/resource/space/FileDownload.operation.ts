import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { OutputType } from '../../../help/type/enums';

export default {
	name: 'Download File (下载文件)',
	value: 'downloadSpaceFile',
	order: 125,
	options: [
		{
			displayName:
				'<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/drive-v1/download/download">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'File Token',
			name: 'file_token',
			type: 'string',
			required: true,
			typeOptions: { password: true },
			default: '',
			description: 'File token to download from Drive',
		},
		{
			displayName: 'Binary Property',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			description: 'Name of the binary property that will hold the downloaded file',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const file_token = this.getNodeParameter('file_token', index) as string;
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index, 'data') as string;
		const response = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/drive/v1/files/${file_token}/download`,
			encoding: 'arraybuffer',
			json: false,
		});
		const binaryData = await this.helpers.prepareBinaryData(
			Buffer.from(response as ArrayBuffer),
			`${file_token}.bin`,
		);
		return {
			outputType: OutputType.Binary,
			binaryData,
			binaryPropertyName,
		};
	},
} as ResourceOperation;
