import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Subscribe File Events (订阅云文档事件)',
	value: 'subscribeFile',
	order: 120,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/drive-v1/event/subscribe">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName:
				'订阅多维表格记录/字段变更：file_type 选 bitable，file_token 填 app_token。然后在 Feishu Suite Trigger 勾选 drive.file.bitable_record_changed_v1 / bitable_field_changed_v1。事件权限必须发布到已启用版本。',
			name: 'bitableSubscribeHint',
			type: 'notice',
			default: '',
		},
		{
			displayName: '文件 Token（File Token）',
			name: 'file_token',
			type: 'string',
			required: true,
			typeOptions: { password: true },
			default: '',
			description: '文档或文件夹 token。多维表格填 app_token。',
		},
		{
			displayName: '文件类型（File Type）',
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
			description: 'Cloud document type',
		},
		{
			displayName: '事件类型（Event Type）',
			name: 'event_type',
			type: 'string',
			default: '',
			description: '文件夹订阅必填，通常是 file.created_in_folder_v1',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const file_token = this.getNodeParameter('file_token', index, '') as string;
		const file_type = this.getNodeParameter('file_type', index, 'docx') as string;
		const event_type = this.getNodeParameter('event_type', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: `/open-apis/drive/v1/files/${file_token}/subscribe`,
			qs: { file_type, event_type },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
