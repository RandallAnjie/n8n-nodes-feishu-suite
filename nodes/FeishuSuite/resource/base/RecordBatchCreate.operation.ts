import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { DESCRIPTIONS } from '../../../help/description';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import NodeUtils from '../../../help/utils/node';
import {
	BITABLE_BATCH_LIMIT,
	BITABLE_RECORD_HINT,
	chunkArray,
	normalizeRecordPayload,
} from '../../../help/utils/bitableRecord';

export default {
	name: WORDING.BatchCreateTableRecords,
	value: OperationType.BatchCreateTableRecords,
	order: 181,
	options: [
		DESCRIPTIONS.BASE_APP_TOKEN,
		DESCRIPTIONS.BASE_TABLE_ID,
		{
			displayName: `${BITABLE_RECORD_HINT} 请求体 {"records":[{"fields":{...}}]}，超过 ${BITABLE_BATCH_LIMIT} 条会自动拆批。`,
			name: 'bitableFieldsHint',
			type: 'notice',
			default: '',
		},
		DESCRIPTIONS.REQUEST_BODY,
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [
				DESCRIPTIONS.USER_ID_TYPE,
				DESCRIPTIONS.IGNORE_CONSISTENCY_CHECK,
				DESCRIPTIONS.REQUEST_ID,
			],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/batch_create">${WORDING.OpenDocument}</a>`,
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
		const body = normalizeRecordPayload(NodeUtils.getObjectData(this, index));
		const options = this.getNodeParameter('options', index, {});
		const user_id_type = (options.user_id_type as string) || 'open_id';
		const ignore_consistency_check = (options.ignore_consistency_check as boolean) || true;
		const client_token = options.request_id as string | undefined;
		const recordsIn = (Array.isArray(body.records) ? body.records : []) as IDataObject[];
		if (!recordsIn.length) {
			throw new NodeOperationError(this.getNode(), 'records 必须是非空数组');
		}
		const created: IDataObject[] = [];

		for (const chunk of chunkArray(recordsIn, BITABLE_BATCH_LIMIT)) {
			const {
				data: { records },
			} = await RequestUtils.request.call(this, {
				method: 'POST',
				url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/batch_create`,
				qs: {
					user_id_type,
					ignore_consistency_check,
					...(client_token && { client_token }),
				},
				body: { ...body, records: chunk },
			});
			if (Array.isArray(records)) {
				created.push(...records);
			}
		}

		return created;
	},
} as ResourceOperation;
