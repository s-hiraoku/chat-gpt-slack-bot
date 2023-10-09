import { SlackFiles } from '../types';

export const SLACK_MENTION_REGEXP = /<@[A-Za-z0-9]+>\n/;
export const NEWLINE_REGEXP = /\n/g;
export const EMPTY_STRING = '';

export const sanitizeText = (text: string) => {
  return text.replace(SLACK_MENTION_REGEXP, '').replace(NEWLINE_REGEXP, '');
};

export const validateFiles = (files: SlackFiles) => {
  return files.length > 0 && files.length <= 1 && files[0].filetype === 'zip';
};
