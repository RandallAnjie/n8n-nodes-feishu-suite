import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { OutputType } from '../../../help/type/enums';

export default {
	name: 'Get Minutes Transcript (获取妙记纪要)',
	value: 'getMinutesTranscript',
	order: 190,
	options: [
		{
			displayName:
				'<a target="_blank" href="https://open.feishu.cn/document/server-docs/minutes-v1/minute-transcript/get">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Minute Token',
			name: 'minute_token',
			type: 'string',
			required: true,
			typeOptions: { password: true },
			default: '',
			description: 'Minutes token from the minutes URL',
		},
		{
			displayName: 'Need Speaker',
			name: 'need_speaker',
			type: 'boolean',
			default: true,
			description: 'Whether to include speaker names in the transcript',
		},
		{
			displayName: 'Need Timestamp',
			name: 'need_timestamp',
			type: 'boolean',
			default: true,
			description: 'Whether to include timestamps in the transcript',
		},
		{
			displayName: 'File Format',
			name: 'file_format',
			type: 'options',
			options: [
				{ name: 'SRT', value: 'srt' },
				{ name: 'TXT', value: 'txt' },
			],
			default: 'txt',
			description: 'Export file format returned as a binary stream',
		},
		{
			displayName: 'Binary Property',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			description: 'Name of the binary property that will hold the transcript file',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const minute_token = this.getNodeParameter('minute_token', index, '') as string;
		const need_speaker = this.getNodeParameter('need_speaker', index, true) as boolean;
		const need_timestamp = this.getNodeParameter('need_timestamp', index, true) as boolean;
		const file_format = this.getNodeParameter('file_format', index, 'txt') as string;
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index, 'data') as string;
		const response = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/minutes/v1/minutes/${minute_token}/transcript`,
			qs: {
				need_speaker,
				need_timestamp,
				file_format,
			},
			encoding: 'arraybuffer',
			json: false,
		});
		const binaryData = await this.helpers.prepareBinaryData(
			Buffer.from(response as ArrayBuffer),
			`${minute_token}.${file_format}`,
		);
		return {
			outputType: OutputType.Binary,
			binaryData,
			binaryPropertyName,
		};
	},
} as ResourceOperation;
