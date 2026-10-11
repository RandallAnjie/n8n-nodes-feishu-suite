import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';

export default {
	name: 'Get Aily Skill (获取技能信息)',
	value: 'ailyGetSkill',
	order: 30,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/aily-v1/skill/get">Open official document</a>',
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
			description: 'Aily application ID, for example spring_xxx__c.',
		},
		{
			displayName: 'Skill ID',
			name: 'skill_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Aily skill ID, for example skill_xxx.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_id = this.getNodeParameter('app_id', index, '') as string;
		const skill_id = this.getNodeParameter('skill_id', index, '') as string;
		const { data } = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/aily/v1/apps/${app_id}/skills/${skill_id}`,
		});
		return (data || {}) as IDataObject;
	},
} as ResourceOperation;
