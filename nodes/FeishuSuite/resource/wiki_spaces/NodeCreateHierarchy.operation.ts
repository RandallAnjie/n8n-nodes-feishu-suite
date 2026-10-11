import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Create Node Hierarchy (创建层级节点)',
	value: 'createSpaceNodeHierarchy',
	order: 70,
	options: [
		{
			displayName:
				'<a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/wiki-v2/space-node/create">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Space ID',
			name: 'space_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Wiki space ID',
		},
		{
			displayName: 'Object Type',
			name: 'obj_type',
			type: 'options',
			options: [
				{ name: 'Bitable', value: 'bitable' },
				{ name: 'Docx', value: 'docx' },
				{ name: 'File', value: 'file' },
				{ name: 'Mindnote', value: 'mindnote' },
				{ name: 'Sheet', value: 'sheet' },
				{ name: 'Slides', value: 'slides' },
			],
			default: 'docx',
			description: 'Document type created for the leaf node',
		},
		{
			displayName: 'Parent Node Token',
			name: 'parent_node_token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Optional parent node token. Leave empty to create under the space root.',
		},
		{
			displayName: 'Breadcrumb Items',
			name: 'breadcrumbItems',
			type: 'json',
			required: true,
			default: '["Folder","Doc title"]',
			description: 'JSON array of titles created from parent to leaf',
		},
		{
			displayName: 'Skip Existing',
			name: 'skipExisting',
			type: 'boolean',
			default: true,
			description: 'Whether to reuse a child node when a title already exists',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const space_id = this.getNodeParameter('space_id', index) as string;
		const obj_type = this.getNodeParameter('obj_type', index, 'docx') as string;
		let parent_node_token = this.getNodeParameter('parent_node_token', index, '') as string;
		const skipExisting = this.getNodeParameter('skipExisting', index, true) as boolean;
		const breadcrumbItems = NodeUtils.getNodeJsonData(this, 'breadcrumbItems', index, []) as string[];

		if (!Array.isArray(breadcrumbItems) || breadcrumbItems.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Breadcrumb items must be a non-empty JSON array');
		}

		const created: IDataObject[] = [];
		for (let i = 0; i < breadcrumbItems.length; i++) {
			const title = String(breadcrumbItems[i]);
			const isLeaf = i === breadcrumbItems.length - 1;
			const currentType = isLeaf ? obj_type : 'docx';

			if (skipExisting && parent_node_token) {
				const { data: childrenData } = await RequestUtils.request.call(this, {
					method: 'GET',
					url: `/open-apis/wiki/v2/spaces/${space_id}/nodes`,
					qs: { parent_node_token },
				});
				const items = ((childrenData as IDataObject)?.items as IDataObject[]) || [];
				const existing = items.find((item) => item.title === title);
				if (existing) {
					parent_node_token = (existing.node_token as string) || parent_node_token;
					created.push({ reused: true, ...(existing as IDataObject) });
					continue;
				}
			}

			const { data } = await RequestUtils.request.call(this, {
				method: 'POST',
				url: `/open-apis/wiki/v2/spaces/${space_id}/nodes`,
				body: {
					obj_type: currentType,
					node_type: 'origin',
					title,
					...(parent_node_token && { parent_node_token }),
				},
			});
			const node = (data as IDataObject)?.node as IDataObject;
			parent_node_token = (node?.node_token as string) || parent_node_token;
			created.push({ reused: false, ...(node || (data as IDataObject)) });
		}

		return { items: created };
	},
} as ResourceOperation;
