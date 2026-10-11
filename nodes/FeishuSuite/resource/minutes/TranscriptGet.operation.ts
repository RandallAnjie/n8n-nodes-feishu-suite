import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Get Minutes Transcript (获取妙记纪要)',
	value: 'getMinutesTranscript',
	order: 190,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/minutes-v1/minute-transcript/get">Open official document</a>',
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
			description: 'Minutes token from the minutes URL.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const minute_token = this.getNodeParameter('minute_token', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/minutes/v1/minutes/${minute_token}/transcript`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
