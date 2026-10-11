import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

function columnLabel(index: number): string {
	let column = '';
	let current = index;
	while (current > 0) {
		const remainder = (current - 1) % 26;
		column = String.fromCharCode(65 + remainder) + column;
		current = Math.floor((current - 1) / 26);
	}
	return column;
}

export default {
	name: 'Auto Write Values (自动写入数据)',
	value: 'autoWriteValues',
	order: 80,
	options: [
		{
			displayName:
				'<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/sheets-v3/data-operation/write-data-to-a-single-range">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Spreadsheet Token',
			name: 'spreadsheet_token',
			type: 'string',
			required: true,
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Sheet ID',
			name: 'sheet_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Worksheet ID used to build the write range',
		},
		{
			displayName: 'Values',
			name: 'values',
			type: 'json',
			required: true,
			default: '[["A1","B1"],["A2","B2"]]',
			description: 'Two-dimensional JSON array of cell values',
		},
		{
			displayName: 'Start Row',
			name: 'start_row',
			type: 'number',
			required: true,
			default: 1,
			description: '1-based row number where writing starts',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const spreadsheet_token = this.getNodeParameter('spreadsheet_token', index) as string;
		const sheet_id = this.getNodeParameter('sheet_id', index) as string;
		const start_row = this.getNodeParameter('start_row', index, 1) as number;
		const values = NodeUtils.getNodeJsonData(this, 'values', index, []) as unknown[];

		if (!Array.isArray(values) || values.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Values must be a non-empty JSON array');
		}

		const firstRow = Array.isArray(values[0]) ? (values[0] as unknown[]) : Object.values(values[0] as IDataObject);
		const endColumn = columnLabel(firstRow.length);
		const range = `${sheet_id}!A${start_row}:${endColumn}${start_row - 1 + values.length}`;

		const { data } = await RequestUtils.request.call(this, {
			method: 'PUT',
			url: `/open-apis/sheets/v2/spreadsheets/${spreadsheet_token}/values`,
			body: {
				valueRange: {
					range,
					values,
				},
			},
		});
		return { range, ...(data as IDataObject) };
	},
} as ResourceOperation;
