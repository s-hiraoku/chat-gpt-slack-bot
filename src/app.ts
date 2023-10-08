import { App } from '@slack/bolt';
import { OPEN_AI_ROLE_TYPE, OpenAIMessages, SlackMessages } from './types';
import { getSlackBotId } from './slack';
import { getEnv } from './utils';
import { initOpenAI, sendMessage } from './openai';
import OpenAI from 'openai';

let slackBotId: string | undefined;
const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, OPENAI_API_KEY, OPENAI_MODEL } = getEnv();

const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET,
});

app.event('app_mention', async ({ event, client, say }) => {
  const threadTs = event.thread_ts ? event.thread_ts : event.ts;
  try {
    const threadMessagesResponse = await client.conversations.replies({
      channel: event.channel,
      ts: threadTs,
    });
    const threadMessages = threadMessagesResponse.messages;

    // Set Conversation history to mentionMessages.
    if (threadMessages) {
      const mentionMessages = threadMessages.reduce((acc: SlackMessages, message) => {
        if (message.text?.includes(`<@${slackBotId}>`) || message.text?.includes(`<@${message.user}>`)) {
          const role = message.user === slackBotId ? OPEN_AI_ROLE_TYPE.assistant : OPEN_AI_ROLE_TYPE.user;
          acc.push({ role: role, content: message.text });
        }
        return acc;
      }, []);
      console.log('mentionMessages', mentionMessages);
      const reply = await sendMessage(mentionMessages as OpenAIMessages);
      if (reply) {
        await say({ text: reply, thread_ts: threadTs });
      }
    }
  } catch (err) {
    console.error(err);
    await say({
      text: `<@${event.user}>\n A defect has occurred. Please contact the developer.\n\n${err}`,
      thread_ts: threadTs,
    });
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);

  if (!SLACK_BOT_TOKEN) {
    console.error(' SLACK_BOT_TOKEN are not set in the environment variables');
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.error(' OPENAI_API_KEY are not set in the environment variables');
    process.exit(1);
  }
  slackBotId = await getSlackBotId(app, SLACK_BOT_TOKEN);

  await initOpenAI(OPENAI_API_KEY, OPENAI_MODEL);

  console.log('⚡️ Bolt app is running!');
})();
