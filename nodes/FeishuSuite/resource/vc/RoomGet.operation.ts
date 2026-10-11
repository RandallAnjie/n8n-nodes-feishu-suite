import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Get Room (获取会议室)',
	value: 'getRoom',
	order: 170,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/vc-v1/room/get">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Room ID',
			name: 'room_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Meeting room ID',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const room_id = this.getNodeParameter('room_id', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/vc/v1/rooms/${room_id}`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
