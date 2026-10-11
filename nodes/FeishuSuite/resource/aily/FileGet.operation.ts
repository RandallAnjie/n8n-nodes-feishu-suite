import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Get Aily File (读取文件信息)',
	value: 'ailyGetFile',
	order: 10,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/aily-v1/file/get">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'File ID',
			name: 'file_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Aily file ID returned by the upload API',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const file_id = this.getNodeParameter('file_id', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/aily/v1/files/${file_id}`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
