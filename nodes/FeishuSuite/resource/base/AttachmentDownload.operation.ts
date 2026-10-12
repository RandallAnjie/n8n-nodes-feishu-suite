import { IBinaryData, IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { DESCRIPTIONS } from '../../../help/description';
import { OperationType, OutputType } from '../../../help/type/enums';
import { WORDING } from '../../../help/wording';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Download Attachment (下载多维表格附件)',
	value: OperationType.DownloadBitableAttachment,
	order: 173,
	options: [
		DESCRIPTIONS.BASE_APP_TOKEN,
		{
			displayName: '文件 Token（File Token）',
			name: 'file_token',
			type: 'string',
			required: true,
			default: '',
			typeOptions: { password: true },
			description: '附件字段里的 file_token',
		},
		{
			displayName: '以二进制输出（Output Binary）',
			name: 'outputAsBinary',
			type: 'boolean',
			default: true,
		},
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [
				{
					displayName: '数据表 ID（Table ID）',
					name: 'table_id',
					type: 'string',
					default: '',
					description: 'Optional table_id used in the download extra payload',
				},
				{
					displayName: '记录 ID（Record ID）',
					name: 'record_id',
					type: 'string',
					default: '',
				},
				{
					displayName: '附件字段名称（Attachment Field Name）',
					name: 'field_name',
					type: 'string',
					default: '',
				},
			],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/drive-v1/media/download">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = NodeUtils.getResourceId(this, 'app_token', index);
		const fileToken = this.getNodeParameter('file_token', index) as string;
		const outputAsBinary = this.getNodeParameter('outputAsBinary', index, true) as boolean;
		const options = this.getNodeParameter('options', index, {}) as IDataObject;
		const rawTable = options.table_id;
		const table_id =
			rawTable && typeof rawTable === 'object'
				? String((rawTable as IDataObject).value ?? '')
				: rawTable
					? String(rawTable)
					: undefined;
		const record_id = options.record_id as string | undefined;
		const field_name = options.field_name as string | undefined;

		const extra: IDataObject = { drive_route_token: app_token };
		if (table_id) {
			extra.bitablePerm = {
				tableId: table_id,
				...(record_id &&
					field_name && {
						attachments: { fieldKey: field_name, recordId: record_id },
					}),
			};
		}

		const buffer = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/drive/v1/medias/${fileToken}/download`,
			encoding: 'arraybuffer',
			json: false,
			qs: { extra: JSON.stringify(extra) },
		});

		const binaryData = await this.helpers.prepareBinaryData(buffer as Buffer);

		if (outputAsBinary) {
			return {
				outputType: OutputType.Binary,
				binaryData,
				binaryPropertyName: 'data',
			};
		}

		const prepared = binaryData as IBinaryData;
		return {
			data: Buffer.from(buffer as Buffer).toString('base64'),
			mimeType: prepared.mimeType,
			fileName: prepared.fileName,
			fileExtension: prepared.fileExtension,
			fileSize: prepared.fileSize,
			file_token: fileToken,
		};
	},
} as ResourceOperation;
