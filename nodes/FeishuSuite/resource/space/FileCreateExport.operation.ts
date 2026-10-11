import { IDataObject, IExecuteFunctions, IBinaryData } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType, OutputType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import { timeoutAndBatchingOptions } from '../../../help/utils/options';

async function pollExportTicket(
	ctx: IExecuteFunctions,
	ticket: string,
	maxPolls: number = 30,
	intervalMs: number = 2000,
): Promise<IDataObject> {
	for (let i = 0; i < maxPolls; i++) {
		const { data } = await RequestUtils.request.call(ctx, {
			method: 'GET',
			url: `/open-apis/drive/v1/export_tasks/${ticket}`,
		});

		const jobStatus = (data.result?.job_status ?? data.job_status) as number;

		if (jobStatus === 0) {
			return data;
		}
		if (jobStatus >= 3) {
			throw new Error(`Export failed: job_status=${jobStatus}, msg=${data.result?.msg ?? data.msg ?? 'unknown error'}`);
		}

		// jobStatus 1 or 2: processing
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	throw new Error(`Export timed out after ${maxPolls * intervalMs}ms`);
}

export default {
	name: WORDING.ExportFile,
	value: OperationType.ExportFile,
	order: 240,
	options: [
		DESCRIPTIONS.FILE_TOKEN,
		{
			displayName: 'File Type (文件类型)',
			name: 'file_type',
			type: 'options',
			required: true,
			default: 'doc',
			options: [
				{ name: 'Doc (文档)', value: 'doc' },
				{ name: 'Docx (文档)', value: 'docx' },
				{ name: 'Sheet (表格)', value: 'sheet' },
				{ name: 'Bitable (多维表格)', value: 'bitable' },
			],
		},
		{
			displayName: 'Export Extension (导出格式)',
			name: 'file_extension',
			type: 'options',
			required: true,
			default: 'pdf',
			options: [
				{ name: 'CSV', value: 'csv' },
				{ name: 'DOCX', value: 'docx' },
				{ name: 'JPEG', value: 'jpeg' },
				{ name: 'PDF', value: 'pdf' },
				{ name: 'PNG', value: 'png' },
				{ name: 'XLSX', value: 'xlsx' },
			],
		},
		{
			displayName: 'Sub ID (子 ID)',
			name: 'sub_id',
			type: 'string',
			default: '',
			description: 'Sub-ID for export, e.g. sheet_id when exporting a specific sheet',
		},
		DESCRIPTIONS.OUTPUT_AS_BINARY,
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [...timeoutAndBatchingOptions],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/export_task/create">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const fileToken = this.getNodeParameter('file_token', index, undefined, {
			extractValue: true,
		}) as string;
		const fileType = this.getNodeParameter('file_type', index) as string;
		const fileExtension = this.getNodeParameter('file_extension', index) as string;
		const subId = this.getNodeParameter('sub_id', index, '') as string;
		const outputAsBinary = this.getNodeParameter('outputAsBinary', index, true) as boolean;

		// Step 1: Create export task
		const { data: createData } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/drive/v1/export_tasks',
			body: {
				file_extension: fileExtension,
				token: fileToken,
				type: fileType,
				...(subId && { sub_id: subId }),
			},
		});

		const ticket = createData.ticket as string;
		if (!ticket) {
			throw new Error('No ticket returned from export task creation');
		}

		// Step 2: Poll until complete
		const exportResult = await pollExportTicket(this, ticket);

		// Step 3: Download exported file
		const exportedFileToken = (exportResult.result as IDataObject)?.file_token as string;
		if (!exportedFileToken) {
			throw new Error('No file_token in export result');
		}

		const buffer = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/drive/v1/files/${exportedFileToken}/download`,
			encoding: 'arraybuffer',
			json: false,
		});

		const binaryData = await this.helpers.prepareBinaryData(buffer);

		if (outputAsBinary) {
			return {
				outputType: OutputType.Binary,
				binaryData,
				binaryPropertyName: 'data',
			};
		}

		// Return as JSON with base64-encoded data
		const base64Data = Buffer.from(buffer).toString('base64');
		return {
			data: base64Data,
			mimeType: binaryData.mimeType,
			fileName: binaryData.fileName,
			fileExtension: binaryData.fileExtension,
			fileSize: binaryData.fileSize,
		} as IBinaryData;
	},
} as ResourceOperation;
