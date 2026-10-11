import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

interface PaginationResponse {
	has_more?: boolean;
	page_token?: string;
	[key: string]: unknown;
}

interface PaginationResult {
	items: IDataObject[];
	hasMore: boolean;
	pageToken?: string;
	totalPages: number;
}

const DEFAULT_ITEMS_KEY = 'items';
const DEFAULT_LIMIT = 100;

function extractItems(data: IDataObject, itemsKey: string): IDataObject[] {
	const value = data[itemsKey];
	return Array.isArray(value) ? (value as IDataObject[]) : [];
}

function extractPaginationMeta(
	data: IDataObject,
): { hasMore: boolean; pageToken?: string } {
	const hasMore = typeof data.has_more === 'boolean' ? data.has_more : !!data.page_token;
	const pageToken =
		typeof data.page_token === 'string' && data.page_token.length > 0
			? (data.page_token as string)
			: undefined;
	return { hasMore, pageToken };
}

export async function handlePagination(
	context: IExecuteFunctions,
	itemIndex: number,
	requestFn: (pageToken?: string) => Promise<PaginationResponse>,
	itemsKey = DEFAULT_ITEMS_KEY,
): Promise<PaginationResult> {
	const returnAll = context.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = context.getNodeParameter('limit', itemIndex, DEFAULT_LIMIT) as number;

	const allItems: IDataObject[] = [];
	let hasMore = true;
	let pageToken: string | undefined;
	let totalPages = 0;

	do {
		const response = await requestFn(pageToken);

		if (!response || typeof response !== 'object') {
			break;
		}

		const pageItems = extractItems(response as unknown as IDataObject, itemsKey);
		const meta = extractPaginationMeta(response as unknown as IDataObject);

		if (pageItems.length === 0 && !meta.hasMore) {
			hasMore = false;
			break;
		}

		if (!returnAll && allItems.length + pageItems.length > limit) {
			const remaining = limit - allItems.length;
			allItems.push(...pageItems.slice(0, remaining));
			hasMore = false;
			break;
		}

		allItems.push(...pageItems);
		totalPages++;

		hasMore = meta.hasMore;
		pageToken = meta.pageToken;

		if (!hasMore) break;
	} while (hasMore);

	return {
		items: allItems,
		hasMore,
		pageToken,
		totalPages,
	};
}

export function handlePaginationAuto(
	requestFn: (pageToken?: string) => Promise<PaginationResponse>,
	itemsKey?: string,
): (
	this: IExecuteFunctions,
	itemIndex: number,
) => Promise<IDataObject> {
	return async function (this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
		const result = await handlePagination(this, itemIndex, requestFn, itemsKey);
		return {
			items: result.items,
			has_more: result.hasMore,
			page_token: result.pageToken ?? '',
		};
	};
}
