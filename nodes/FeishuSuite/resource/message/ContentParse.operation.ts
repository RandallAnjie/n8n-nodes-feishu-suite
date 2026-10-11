import {
	IDataObject,
	IExecuteFunctions,
	NodeOperationError,
	jsonParse,
} from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import { MessageType, OperationType } from '../../../help/type/enums';
import { WORDING } from '../../../help/wording';

export default {
	name: WORDING.ParseMessageContent,
	value: OperationType.ParseMessageContent,
	order: 240,
	options: [
		{
			displayName: 'Message Content (消息内容)',
			name: 'content',
			type: 'json',
			required: true,
			default: '{}',
			description: 'The message content body to parse, e.g. {"text": "hello"} for text type',
		},
		{
			displayName: 'Message Type (消息类型)',
			name: 'msg_type',
			type: 'options',
			required: true,
			default: 'text',
			options: [
				{ name: 'Text (文本)', value: MessageType.Text },
				{ name: 'Rich Text / Post (富文本)', value: MessageType.RichText },
				{ name: 'Interactive Card (卡片)', value: MessageType.Card },
				{ name: 'Image (图片)', value: MessageType.Image },
				{ name: 'File (文件)', value: MessageType.File },
				{ name: 'Audio (音频)', value: MessageType.Audio },
				{ name: 'Video (视频)', value: MessageType.Video },
				{ name: 'Location (位置)', value: MessageType.Location },
				{ name: 'Todo (任务)', value: MessageType.Todo },
				{ name: 'Calendar Event (日程)', value: MessageType.CalendarEvent },
			],
			description: 'The type of the message content being parsed',
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/im-v1/message-content-description">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],

	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const rawContent = this.getNodeParameter('content', index) as string | IDataObject;
		const msgType = this.getNodeParameter('msg_type', index) as string;

		let content: IDataObject;
		if (typeof rawContent === 'string') {
			try {
				content = jsonParse<IDataObject>(rawContent);
			} catch {
				throw new NodeOperationError(this.getNode(), 'Message content is not valid JSON');
			}
		} else {
			content = rawContent;
		}

		if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
			throw new NodeOperationError(this.getNode(), 'Message content is empty');
		}

		// Parse rich text content into grouped structure
		if (msgType === MessageType.RichText) {
			const richContent = content as IDataObject;
			if (richContent && Array.isArray(richContent.content)) {
				const tagGroups: { [tag: string]: any[] } = {};

				for (const contentArray of richContent.content) {
					if (Array.isArray(contentArray)) {
						for (const element of contentArray) {
							if (element && typeof element === 'object' && element.tag) {
								if (!tagGroups[element.tag]) {
									tagGroups[element.tag] = [];
								}

								const { tag, ...elementWithoutTag } = element;
								tagGroups[element.tag].push(elementWithoutTag);
							}
						}
					}
				}

				const parsedContent = Object.keys(tagGroups).map((tag) => ({
					tag,
					elements: tagGroups[tag],
				}));

				return {
					msg_type: msgType,
					parsed: {
						title: (richContent.title as string) || '',
						content: parsedContent,
					},
				};
			}
		}

		// For text type, extract the text field
		if (msgType === MessageType.Text) {
			const textContent = content as IDataObject;
			return {
				msg_type: msgType,
				parsed: {
					text: (textContent.text as string) || '',
				},
			};
		}

		// For card/interactive type, return as-is since it's already structured JSON
		if (msgType === MessageType.Card) {
			return {
				msg_type: msgType,
				parsed: content,
			};
		}

		// For media types (image, file, audio, video), extract keys
		if (
			[MessageType.Image, MessageType.File, MessageType.Audio, MessageType.Video].includes(
				msgType as MessageType,
			)
		) {
			const mediaContent = content as IDataObject;
			return {
				msg_type: msgType,
				parsed: {
					file_key: mediaContent.file_key || mediaContent.image_key,
					...(mediaContent.duration !== undefined && {
						duration: mediaContent.duration,
					}),
				},
			};
		}

		// For location type
		if (msgType === MessageType.Location) {
			const locContent = content as IDataObject;
			return {
				msg_type: msgType,
				parsed: {
					latitude: locContent.latitude,
					longitude: locContent.longitude,
					name: locContent.name,
					address: locContent.address,
				},
			};
		}

		// Default: return content as-is
		return {
			msg_type: msgType,
			parsed: content,
		};
	},
} as ResourceOperation;
