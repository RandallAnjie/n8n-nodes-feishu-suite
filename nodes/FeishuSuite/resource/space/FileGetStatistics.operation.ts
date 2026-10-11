import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';

export default {
	name: WORDING.GetFileStatistics,
	value: OperationType.GetFileStatistics,
	order: 220,
	options: [
		DESCRIPTIONS.FILE_TOKEN,
		{
			displayName: 'File Type (文件类型)',
			name: 'file_type',
			type: 'options',
			required: true,
			default: 'doc',
			options: [
				{ name: 'Doc', value: 'doc' },
				{ name: 'Sheet', value: 'sheet' },
				{ name: 'Bitable', value: 'bitable' },
				{ name: 'Docx', value: 'docx' },
			],
		},
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [DESCRIPTIONS.USER_ID_TYPE],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/file-statistics/get">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const fileToken = this.getNodeParameter('file_token', index, undefined, {
			extractValue: true,
		}) as string;
		const fileType = this.getNodeParameter('file_type', index, 'doc') as string;
		const options = this.getNodeParameter('options', index, {}) as IDataObject;
		const user_id_type = (options.user_id_type as string) || 'open_id';

		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/drive/v1/files/${fileToken}/statistics`,
			qs: {
				file_type: fileType,
				user_id_type,
			},
		});

		return data;
	},
} as ResourceOperation;
