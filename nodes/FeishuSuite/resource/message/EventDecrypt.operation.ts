import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import { decryptFeishuEvent } from '../../../help/utils/FeishuDecryptUtils';

export default {
	name: 'Decrypt Event (解密事件消息)',
	value: 'decryptEvent',
	order: 50,
	options: [
		{
			displayName:
				'<a target="_blank" href="https://open.feishu.cn/document/event-subscription-guide/event-subscriptions/event-subscription-configure-/encrypt-key-encryption-configuration-case">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Encrypt Key',
			name: 'encrypt_key',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Encrypt Key from the Feishu/Lark developer console event subscription page.',
		},
		{
			displayName: 'Encrypt Data',
			name: 'encrypt_data',
			type: 'string',
			required: true,
			default: '',
			description: 'Encrypted event payload, usually the encrypt field of the webhook body.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const encryptKey = this.getNodeParameter('encrypt_key', index) as string;
		const encryptData = this.getNodeParameter('encrypt_data', index) as string;
		const decryptedData = decryptFeishuEvent(encryptKey, encryptData);
		if (!decryptedData) {
			throw new NodeOperationError(this.getNode(), 'Failed to decrypt event payload');
		}
		try {
			return JSON.parse(decryptedData) as IDataObject;
		} catch {
			throw new NodeOperationError(this.getNode(), 'Decrypted payload is not valid JSON');
		}
	},
} as ResourceOperation;
