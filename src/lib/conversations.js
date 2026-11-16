export function isCurrentConversation(requestedUserId, activeUserId) {
  return Boolean(requestedUserId) && requestedUserId === activeUserId;
}
