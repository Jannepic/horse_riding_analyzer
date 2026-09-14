/** Path logic of the local video store. Matches a strict pattern instead of sanitising. */

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const FILE_NAME = /^[0-9a-f-]{36}\.(mp4|webm|mov|mpeg)$/;

const BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/mpeg": "mpeg",
};

export function extensionFor(mimeType: string): string {
  return BY_MIME[mimeType] ?? "mp4";
}

export function isConversationId(value: string): boolean {
  return UUID.test(value.toLowerCase());
}

export function isVideoFileName(value: string): boolean {
  return FILE_NAME.test(value.toLowerCase());
}

export function videoFileName(messageId: string, mimeType: string): string {
  if (!isConversationId(messageId)) {
    throw new Error("Unbrauchbare Nachrichten-ID");
  }
  return `${messageId.toLowerCase()}.${extensionFor(mimeType)}`;
}

export function videoSegments(conversationId: string, fileName: string): string[] {
  if (!isConversationId(conversationId)) {
    throw new Error("Unbrauchbare Konversations-ID");
  }
  if (!isVideoFileName(fileName)) {
    throw new Error("Unbrauchbarer Dateiname");
  }
  return [conversationId.toLowerCase(), fileName.toLowerCase()];
}

export function conversationSegment(conversationId: string): string {
  if (!isConversationId(conversationId)) {
    throw new Error("Unbrauchbare Konversations-ID");
  }
  return conversationId.toLowerCase();
}

export function mimeForFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  for (const [mime, e] of Object.entries(BY_MIME)) if (e === ext) return mime;
  return "application/octet-stream";
}
