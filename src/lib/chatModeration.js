const BLOCKED_TERMS = /\b(?:fuck|shit|bitch|asshole|bastard|damn|idiot|stupid|kill yourself)\b/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const URL = /\b(?:https?:\/\/|www\.)/i;
const PHONE_NUMBER = /\d(?:[\s().-]*\d){8,}/;

export function chatMessageProblem(value) {
  const message = value.trim();

  if (!message) return 'Write a message first.';
  if (message.length > 500) return 'Messages must be 500 characters or fewer.';
  if (EMAIL.test(message) || URL.test(message) || PHONE_NUMBER.test(message)) {
    return 'For safety, messages cannot include links, email addresses, or phone numbers.';
  }
  if (BLOCKED_TERMS.test(message)) {
    return 'Please reword that message. Some language is not allowed in chat.';
  }

  return '';
}
