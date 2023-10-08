import { OpenAIRoleType } from './openai';

export type Role = Omit<OpenAIRoleType, 'system'>;
export type SlackMessage = {
  role: Role;
  content: string;
};
export type SlackMessages = Array<SlackMessage>;
