export const DIRECT_MESSAGE_MAX_LENGTH = 4000;
export const DIRECT_MESSAGE_PAGE_SIZE = 40;
export const MESSAGES_READ_EVENT = "athlink:messages-read";

export type MessagesReadEventDetail = {
  conversationId: string;
  unreadCount: number;
};
