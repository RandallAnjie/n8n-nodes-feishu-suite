import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import NodeUtils from '../../../help/utils/node';
import { BITABLE_BATCH_LIMIT, chunkArray, extractRecordIdList } from '../../../help/utils/bitableRecord';

export default {
	name: WORDING.BatchDeleteTableRecords,
	value: OperationType.BatchDeleteTableRecords,
	order: 178,
	options: [
		DESCRIPTIONS.BASE_APP_TOKEN,
		DESCRIPTIONS.BASE_TABLE_ID,
		{
			displayName: `请求体 {"records":["recXXX"]}，单次最多 ${BITABLE_BATCH_LIMIT} 条，超过会自动拆批。`,
			name: 'bitableFieldsHint',
			type: 'notice',
			default: '',
		},
		DESCRIPTIONS.REQUEST_BODY,
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/batch_delete">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],

	async call(this: IExecuteFunctions, index: number): Promise<IDataObject[]> {
		const app_token = this.getNodeParameter('app_token', index, undefined, {
			extractValue: true,
		}) as string;
		const table_id = this.getNodeParameter('table_id', index, undefined, {
			extractValue: true,
		}) as string;
		const body = NodeUtils.getObjectData(this, index);
		const ids = extractRecordIdList(body);
		if (!ids.length) {
			throw new NodeOperationError(this.getNode(), 'records 必须是非空的 record_id 数组');
		}
		const deleted: IDataObject[] = [];

		for (const chunk of chunkArray(ids.length ? ids : [], BITABLE_BATCH_LIMIT)) {
			const {
				data: { records },
			} = await RequestUtils.request.call(this, {
				method: 'POST',
				url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/batch_delete`,
				body: { records: chunk },
			});
			if (Array.isArray(records)) {
				deleted.push(...records);
			}
		}

		return deleted;
	},
} as ResourceOperation;
