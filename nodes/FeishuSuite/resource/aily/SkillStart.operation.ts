import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Start Aily Skill (调用技能)',
	value: 'ailyStartSkill',
	order: 50,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/aily-v1/skill/start">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Aily App ID',
			name: 'app_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Aily application ID, for example spring_xxx__c',
		},
		{
			displayName: 'Skill ID',
			name: 'skill_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Aily skill ID, for example skill_xxx',
		},
		{
			displayName: 'Request Body',
			name: 'body',
			type: 'json',
			default: '{}',
			description: 'JSON request body merged into the API call',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_id = this.getNodeParameter('app_id', index, '') as string;
		const skill_id = this.getNodeParameter('skill_id', index, '') as string;
		const body = NodeUtils.getNodeJsonData(this, 'body', index, {}) as IDataObject;
		const { data } = await RequestUtils.request.call(this, {
			method: 'POST',
			url: `/open-apis/aily/v1/apps/${app_id}/skills/${skill_id}/start`,
			body: { ...body },
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
