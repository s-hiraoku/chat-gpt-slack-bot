import { App } from '@slack/bolt';
import { OPEN_AI_ROLE_TYPE, OpenAIMessages } from './types';
import { Message } from '@slack/web-api/dist/response/ConversationsRepliesResponse';
import { sanitizeText } from './utils';

export const getSlackBotId = async (app: App, slackBotToken: string) => {
  try {
    const result = await app.client.auth.test({ token: slackBotToken });
    const botUserId = result.user_id; // user_id contains the Bot User ID
    console.log('Bot User ID:', botUserId);
    return botUserId;
  } catch (error) {
    console.error(error);
  }
};

export const covertSlackMessageToOpenAIMessage = (slackMessages: Message[], slackBotId: string): OpenAIMessages => {
  // Set Conversation history to conversations.
  const conversations = slackMessages.reduce((acc: OpenAIMessages, message) => {
    if (message.text) {
      const role = message.user === slackBotId ? OPEN_AI_ROLE_TYPE.assistant : OPEN_AI_ROLE_TYPE.user;
      const content = sanitizeText(message.text);
      acc.push({ role: role, content });
    }
    return acc;
  }, []);
  return conversations;
};
