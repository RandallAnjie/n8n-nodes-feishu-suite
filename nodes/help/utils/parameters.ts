import { INodeParameters } from 'n8n-workflow';

export const configuredOutputs = (_parameters: INodeParameters) => {
	return ['main'];
};

export const hexToRgbInt32 = (hex: string): number => {
	// Remove # if present
	const cleanHex = hex.replace('#', '');

	// Parse RGB values
	const r = parseInt(cleanHex.substring(0, 2), 16);
	const g = parseInt(cleanHex.substring(2, 4), 16);
	const b = parseInt(cleanHex.substring(4, 6), 16);

	// Convert to int32: (r << 16) | (g << 8) | b
	return (r << 16) | (g << 8) | b;
};
