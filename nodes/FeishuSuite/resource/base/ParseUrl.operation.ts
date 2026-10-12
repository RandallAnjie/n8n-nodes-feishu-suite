import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Parse Bitable URL (解析多维表格链接)',
	value: 'parseBitableUrl',
	order: 40,
	options: [
		{
			displayName: 'Bitable URL (多维表格链接)',
			name: 'url',
			type: 'string',
			required: true,
			default: '',
			description:
				'Full Feishu or Lark bitable URL containing the app token and optional table / view IDs',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const url = this.getNodeParameter('url', index) as string;
		const appMatch = url.match(/\/(?:base|app)\/([a-zA-Z0-9]+)/);
		if (!appMatch) {
			throw new NodeOperationError(
				this.getNode(),
				'Unable to parse app token from the URL. Expected /base/{app_token} or /app/{app_token}.',
			);
		}
		const tableMatch = url.match(/[?&]table=([a-zA-Z0-9]+)/);
		const viewMatch = url.match(/[?&]view=([a-zA-Z0-9]+)/);
		return {
			app_token: appMatch[1],
			table_id: tableMatch?.[1] ?? '',
			view_id: viewMatch?.[1] ?? '',
			url,
		};
	},
} as ResourceOperation;
