import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Unsubscribe File Events (取消订阅云文档事件)',
	value: 'unsubscribeFile',
	order: 110,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/drive-v1/event/delete_subscribe">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'File Token',
			name: 'file_token',
			type: 'string',
			required: true,
			typeOptions: { password: true },
			default: '',
			description: 'Document or folder token',
		},
		{
			displayName: 'File Type',
			name: 'file_type',
			type: 'options',
			options: [
				{ name: 'Bitable', value: 'bitable' },
				{ name: 'Doc', value: 'doc' },
				{ name: 'Docx', value: 'docx' },
				{ name: 'File', value: 'file' },
				{ name: 'Folder', value: 'folder' },
				{ name: 'Sheet', value: 'sheet' },
				{ name: 'Slides', value: 'slides' },
			],
			default: 'bitable',
			description: 'Cloud document type. Use bitable for a Base app_token.',
		},
		{
			displayName: 'Event Type',
			name: 'event_type',
			type: 'string',
			default: '',
			description: 'Required for folder subscriptions, usually file.created_in_folder_v1',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const file_token = this.getNodeParameter('file_token', index, '') as string;
		const file_type = this.getNodeParameter('file_type', index, 'docx') as string;
		const event_type = this.getNodeParameter('event_type', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'DELETE',
			url: `/open-apis/drive/v1/files/${file_token}/delete_subscribe`,
			qs: { file_type, event_type },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
