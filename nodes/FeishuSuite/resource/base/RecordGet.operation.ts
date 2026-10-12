import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { DESCRIPTIONS } from '../../../help/description';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Get Record (获取记录)',
	value: OperationType.GetTableRecord,
	order: 95,
	options: [
		DESCRIPTIONS.BASE_APP_TOKEN,
		DESCRIPTIONS.BASE_TABLE_ID,
		DESCRIPTIONS.TABLE_RECORD_ID,
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [DESCRIPTIONS.USER_ID_TYPE],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/get">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = NodeUtils.getResourceId(this, 'app_token', index);
		const table_id = NodeUtils.getResourceId(this, 'table_id', index);
		const record_id = NodeUtils.getResourceId(this, 'record_id', index);
		const options = this.getNodeParameter('options', index, {}) as IDataObject;
		const user_id_type = (options.user_id_type as string) || 'open_id';
		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/${record_id}`,
			qs: { user_id_type },
		});
		return ((data as IDataObject)?.record as IDataObject) || (data as IDataObject) || {};
	},
} as ResourceOperation;
