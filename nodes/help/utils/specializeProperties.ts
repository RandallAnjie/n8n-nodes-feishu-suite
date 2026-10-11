import type { INodeProperties } from 'n8n-workflow';

export function specializeProperties(allProps: INodeProperties[], resource: string): INodeProperties[] {
	const filtered: INodeProperties[] = [];
	for (const prop of allProps) {
		if (prop.name === 'resource') {
			filtered.push({
				displayName: 'Resource',
				name: 'resource',
				type: 'hidden',
				default: resource,
			});
			continue;
		}
		const show = prop.displayOptions?.show as { resource?: string[] } | undefined;
		if (!show) {
			filtered.push(prop);
			continue;
		}
		if (show.resource?.includes(resource)) {
			filtered.push(prop);
		}
	}
	return filtered;
}
