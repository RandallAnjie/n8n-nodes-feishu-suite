import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import ResourceFactory from '../help/builder/ResourceFactory';
import { Credentials } from '../help/type/enums';
import { specializeProperties } from '../help/utils/specializeProperties';
import { executeResourceOperation } from '../help/utils/executeResource';

const resourceBuilder = ResourceFactory.build(require('path').resolve(__dirname, '..', 'FeishuSuite'));
const RESOURCE = 'vc';

export class FeishuSuiteVc implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Feishu Suite VC',
		name: 'feishuSuiteVc',
		icon: 'file:lark_icon.svg',
		group: ['input'],
		version: [1],
		defaultVersion: 1,
		description: 'Video conference and room operations',
		subtitle: '={{ $parameter["operation"] }}',
		defaults: {
			name: 'Feishu Suite VC',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: ['main'],
		credentials: [
			{
				name: Credentials.TenantToken,
				required: true,
				displayOptions: {
					show: {
						authentication: [Credentials.TenantToken],
					},
				},
			},
			{
				name: Credentials.UserToken,
				required: true,
				displayOptions: {
					show: {
						authentication: [Credentials.UserToken],
					},
				},
			},
		],
		properties: specializeProperties(resourceBuilder.build(), RESOURCE),
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return executeResourceOperation(this, RESOURCE, resourceBuilder.getCall.bind(resourceBuilder));
	}
}
