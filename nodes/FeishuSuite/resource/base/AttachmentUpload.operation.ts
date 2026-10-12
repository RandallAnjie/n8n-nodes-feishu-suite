import FormData from 'form-data';
import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { DESCRIPTIONS } from '../../../help/description';
import { OperationType } from '../../../help/type/enums';
import { WORDING } from '../../../help/wording';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Upload Attachment (上传附件到多维表格)',
	value: OperationType.UploadBitableAttachment,
	order: 174,
	options: [
		DESCRIPTIONS.BASE_APP_TOKEN,
		DESCRIPTIONS.BASE_TABLE_ID,
		{
			displayName: '二进制字段（Binary Field）',
			name: 'file_binary_field',
			type: 'string',
			required: true,
			default: 'data',
			description: '输入项里存放文件二进制的字段名，默认 data',
		},
		{
			displayName:
				'上传点是当前多维表格。得到 file_token 后写入附件字段：{"Files":[{"file_token":"..."}]}。勾选「写入记录」可一步完成。',
			name: 'bitableAttachHint',
			type: 'notice',
			default: '',
		},
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [
				{
					displayName: '写入记录（Write to Record）',
					name: 'write_record',
					type: 'boolean',
					default: false,
					description: 'Whether to write the file_token into the record attachment field after upload',
				},
				{
					displayName: '记录 ID（Record ID）',
					name: 'record_id',
					type: 'string',
					default: '',
					description: 'Optional record to attach the file to',
				},
				{
					displayName: '附件字段名称（Attachment Field Name）',
					name: 'field_name',
					type: 'string',
					default: '',
					description: 'Attachment field name, not field_id',
				},
				{
					displayName: '上传类型（Parent Type）',
					name: 'parent_type',
					type: 'options',
					options: [
						{ name: 'Bitable File', value: 'bitable_file' },
						{ name: 'Bitable Image', value: 'bitable_image' },
					],
					default: 'bitable_file',
				},
			],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/drive-v1/media/upload_all">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = NodeUtils.getResourceId(this, 'app_token', index);
		const table_id = NodeUtils.getResourceId(this, 'table_id', index);
		const fileBinaryField = this.getNodeParameter('file_binary_field', index, 'data') as string;
		const options = this.getNodeParameter('options', index, {}) as IDataObject;
		const parentType = (options.parent_type as string) || 'bitable_file';
		const writeRecord = Boolean(options.write_record);
		const record_id = (options.record_id as string) || '';
		const field_name = (options.field_name as string) || '';

		const binaryData = await this.helpers.assertBinaryData(index, fileBinaryField);
		const buffer = await this.helpers.getBinaryDataBuffer(index, fileBinaryField);
		const fileName = binaryData.fileName || 'upload.bin';

		const formData = new FormData();
		formData.append('file_name', fileName);
		formData.append('parent_type', parentType);
		formData.append('parent_node', app_token);
		formData.append('size', String(buffer.length));
		formData.append('extra', JSON.stringify({ drive_route_token: app_token }));
		formData.append('file', buffer);

		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/drive/v1/medias/upload_all',
			body: formData,
			json: true,
		});

		const file_token = (data as IDataObject)?.file_token as string | undefined;
		const result: IDataObject = {
			file_token,
			file_name: fileName,
			app_token,
			table_id,
		};

		if (writeRecord) {
			if (!record_id || !field_name || !file_token) {
				throw new NodeOperationError(
					this.getNode(),
					'写入记录需要 record_id、附件字段名称，以及上传返回的 file_token',
				);
			}
			const { data: recordData } = await RequestUtils.request.call(this, {
				method: 'PUT',
				url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/${record_id}`,
				body: {
					fields: {
						[field_name]: [{ file_token }],
					},
				},
			});
			result.record = recordData;
			result.written = true;
		}

		return result;
	},
} as ResourceOperation;
