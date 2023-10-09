export const SLACK_MENTION_REGEXP = /<@[A-Za-z0-9]+>\n/;
export const NEWLINE_REGEXP = /\n/g;
export const EMPTY_STRING = '';

export const sanitizeText = (text: string) => {
  return text.replace(SLACK_MENTION_REGEXP, '').replace(NEWLINE_REGEXP, '');
};