export type OpenAIRoleType = 'user' | 'assistant' | 'system';
export const OPEN_AI_ROLE_TYPE = {
  user: 'user',
  assistant: 'assistant',
  system: 'system',
} as const satisfies Record<OpenAIRoleType, OpenAIRoleType>;

export type OpenAIMessage = {
  role: OpenAIRoleType;
  content: string;
};

export type OpenAIMessages = Array<OpenAIMessage>;
