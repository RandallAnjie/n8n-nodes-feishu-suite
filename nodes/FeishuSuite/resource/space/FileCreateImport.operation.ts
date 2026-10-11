import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { timeoutAndBatchingOptions } from '../../../help/utils/options';

async function pollImportTicket(
	ctx: IExecuteFunctions,
	ticket: string,
	maxPolls: number = 30,
	intervalMs: number = 2000,
): Promise<IDataObject> {
	for (let i = 0; i < maxPolls; i++) {
		const { data } = await RequestUtils.request.call(ctx, {
			method: 'GET',
			url: `/open-apis/drive/v1/import_tasks/${ticket}`,
		});

		const jobStatus = (data.result?.job_status ?? data.job_status) as number;

		if (jobStatus === 0) {
			return data;
		}
		if (jobStatus >= 3) {
			throw new Error(`Import failed: job_status=${jobStatus}, msg=${data.result?.msg ?? data.msg ?? 'unknown error'}`);
		}

		// jobStatus 1 or 2: processing
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	throw new Error(`Import timed out after ${maxPolls * intervalMs}ms`);
}

export default {
	name: WORDING.ImportFile,
	value: OperationType.ImportFile,
	order: 230,
	options: [
		{
			displayName: 'File Name (文件名称)',
			name: 'file_name',
			type: 'string',
			required: true,
			default: '',
			description: 'File name with extension, e.g. report.docx',
		},
		{
			displayName: 'File Extension (文件扩展名)',
			name: 'file_extension',
			type: 'options',
			required: true,
			default: 'docx',
			options: [
				{ name: 'CSV', value: 'csv' },
				{ name: 'DOCX', value: 'docx' },
				{ name: 'HTML', value: 'html' },
				{ name: 'Markdown', value: 'md' },
				{ name: 'Text', value: 'txt' },
				{ name: 'XLSX', value: 'xlsx' },
			],
		},
		{
			displayName: 'File Token (文件 Token)',
			name: 'file_token',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'The file token of the source file to import',
		},
		{
			displayName: 'Import Type (导入类型)',
			name: 'type',
			type: 'options',
			required: true,
			default: 'docx',
			options: [
				{ name: 'Docx (文档)', value: 'docx' },
				{ name: 'Sheet (表格)', value: 'sheet' },
				{ name: 'Bitable (多维表格)', value: 'bitable' },
				{ name: 'Doc (文档)', value: 'doc' },
			],
		},
		{
			displayName: 'Folder Token (目标文件夹 Token)',
			name: 'point',
			type: 'string',
			default: '',
			description: 'Target folder token to import into. Leave empty for root directory.',
		},
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [...timeoutAndBatchingOptions],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/import_task/create">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const fileName = this.getNodeParameter('file_name', index) as string;
		const fileExtension = this.getNodeParameter('file_extension', index, 'docx') as string;
		const fileToken = this.getNodeParameter('file_token', index) as string;
		const type = this.getNodeParameter('type', index, 'docx') as string;
		const point = this.getNodeParameter('point', index, '') as string;

		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/drive/v1/import_tasks',
			body: {
				file_name: fileName,
				file_extension: fileExtension,
				file_token: fileToken,
				type,
				...(point && { point }),
			},
		});

		const ticket = data.ticket as string;
		if (!ticket) {
			throw new Error('No ticket returned from import task creation');
		}

		const result = await pollImportTicket(this, ticket);

		return result;
	},
} as ResourceOperation;
