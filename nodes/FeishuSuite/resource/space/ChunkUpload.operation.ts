import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import FormData from 'form-data';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';

function adler32(data: Buffer): number {
	const MOD_ADLER = 65521;
	let a = 1;
	let b = 0;
	for (let i = 0; i < data.length; i++) {
		a = (a + data[i]) % MOD_ADLER;
		b = (b + a) % MOD_ADLER;
	}
	return ((b << 16) | a) >>> 0;
}

export default {
	name: 'Chunk Upload File (分片上传文件)',
	value: 'chunkUploadFile',
	order=160,
	options: [
		{
			displayName:
				'<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/drive-v1/upload/multipart-upload-file-/introduction">Open official document</a>',
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
			description: 'Destination folder token.',
		},
		{
			displayName: 'Binary Field',
			name: 'file_binary_field',
			type: 'string',
			required: true,
			default: 'data',
			description: 'Name of the incoming binary property that contains the file.',
		},
		{
			displayName: 'File Name',
			name: 'file_name',
			type: 'string',
			default: '',
			description: 'Optional override for the uploaded file name.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const folder_token = this.getNodeParameter('folder_token', index) as string;
		const file_binary_field = this.getNodeParameter('file_binary_field', index) as string;
		const overrideName = this.getNodeParameter('file_name', index, '') as string;
		const binaryData = await this.helpers.assertBinaryData(index, file_binary_field);
		const buffer = await this.helpers.getBinaryDataBuffer(index, file_binary_field);
		const file_name = overrideName || binaryData.fileName;
		if (!file_name) {
			throw new NodeOperationError(this.getNode(), 'File name is required');
		}

		const { data: prepare } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/drive/v1/files/upload_prepare',
			body: {
				file_name,
				parent_type: 'explorer',
				parent_node: folder_token,
				size: buffer.length,
			},
		});

		const upload_id = prepare.upload_id as string;
		const block_size = prepare.block_size as number;
		const block_num = prepare.block_num as number;
		if (!upload_id) {
			throw new NodeOperationError(this.getNode(), 'upload_prepare did not return upload_id');
		}

		for (let seq = 0; seq < block_num; seq++) {
			const start = seq * block_size;
			const chunk = buffer.subarray(start, Math.min(start + block_size, buffer.length));
			const formData = new FormData();
			formData.append('upload_id', upload_id);
			formData.append('seq', String(seq));
			formData.append('size', String(chunk.length));
			formData.append('checksum', String(adler32(chunk)));
			formData.append('file', chunk, { filename: `part-${seq}` });
			await RequestUtils.request.call(this, {
				method: 'POST',
				url: '/open-apis/drive/v1/files/upload_part',
				body: formData,
				json: true,
			});
		}

		const { data: finish } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/drive/v1/files/upload_finish',
			body: { upload_id, block_num },
		});

		return {
			upload_id,
			block_size,
			block_num,
			file_name,
			file_size: buffer.length,
			...(finish as IDataObject),
		};
	},
} as ResourceOperation;
