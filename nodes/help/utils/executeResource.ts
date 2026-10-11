import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { OutputType } from '../type/enums';

export async function executeResourceOperation(
	ctx: IExecuteFunctions,
	resource: string,
	getCall: (resourceName: string, operateName: string) => Function | null,
): Promise<INodeExecutionData[][]> {
	const items = ctx.getInputData();
	let returnData: INodeExecutionData[][] = Array.from({ length: 1 }, () => []);
	const operation = ctx.getNodeParameter('operation', 0);
	const callFunc = getCall(resource, operation as string);

	if (!callFunc) {
		throw new NodeOperationError(ctx.getNode(), `No operation found: ${resource}.${operation}`);
	}

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const responseData = (await callFunc.call(ctx, itemIndex)) as IDataObject;
			const { outputType } = responseData;
			if (!outputType) {
				const executionData = ctx.helpers.constructExecutionMetaData(
					ctx.helpers.returnJsonArray(responseData),
					{ itemData: { item: itemIndex } },
				);
				returnData[0].push(...executionData);
			} else if (outputType === OutputType.Multiple) {
				const { outputData } = responseData as { outputData: INodeExecutionData[][] };
				returnData = outputData;
			} else if (outputType === OutputType.Binary) {
				const { binaryData, binaryPropertyName = 'data' } = responseData as {
					binaryData: IDataObject;
					binaryPropertyName?: string;
				};
				const executionData = ctx.helpers.constructExecutionMetaData(
					[
						{
							json: {},
							binary: { [binaryPropertyName]: binaryData },
						},
					] as INodeExecutionData[],
					{ itemData: { item: itemIndex } },
				);
				returnData[0].push(...executionData);
			}
		} catch (error) {
			if (ctx.continueOnFail()) {
				const executionErrorData = ctx.helpers.constructExecutionMetaData(
					ctx.helpers.returnJsonArray({ error: error.description ?? error.message }),
					{ itemData: { item: itemIndex } },
				);
				returnData[0].push(...executionErrorData);
				continue;
			} else if (error.name === 'NodeApiError') {
				throw error;
			} else {
				throw new NodeOperationError(ctx.getNode(), error, {
					message: error.message,
					itemIndex,
				});
			}
		}
	}

	return returnData;
}
