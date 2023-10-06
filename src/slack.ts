import { App } from '@slack/bolt';

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
