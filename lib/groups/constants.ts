export const GROUP_NAME_MAX = 80;
export const GROUP_DESCRIPTION_MAX = 2000;
export const GROUP_POST_MAX = 5000;
export const GROUP_COMMENT_MAX = 2000;
export const GROUP_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const GROUP_PAGE_SIZE = 18;
export const POST_PAGE_SIZE = 10;
export const COMMENT_PAGE_SIZE = 8;
export const MEMBER_PAGE_SIZE = 24;
export const GROUP_POST_IMAGE_SIGNED_URL_TTL_SECONDS = 60 * 60;
export const GROUP_POST_IMAGE_REFRESH_MS = 50 * 60 * 1000;

export const GROUP_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
