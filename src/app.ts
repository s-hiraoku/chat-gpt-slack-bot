import { App } from '@slack/bolt';
import { load } from 'ts-dotenv';
import { Env, OPEN_AI_ROLE_TYPE } from './types';
import { getSlackBotId } from './slack';

let env: Partial<Env>;
let slackBotId: string | undefined;

try {
  env = load({
    SLACK_BOT_TOKEN: String,
    SLACK_SIGNING_SECRET: String,
    PORT: Number,
    OPENAI_API_KEY: String,
  });
} catch (err) {
  console.error('Failed to load environment variables', err);
  process.exit(1);
}

if (!env.SLACK_BOT_TOKEN || !env.SLACK_SIGNING_SECRET || !env.OPENAI_API_KEY) {
  console.error(
    'SLACK_BOT_TOKEN and/or SLACK_SIGNING_SECRET and/or OPENAI_API_KEY are not set in the environment variables',
  );
  process.exit(1);
}

const app = new App({
  token: env.SLACK_BOT_TOKEN,
  signingSecret: env.SLACK_SIGNING_SECRET,
});

app.event('app_mention', async ({ event, client, say }) => {
  const threadTs = event.thread_ts ? event.thread_ts : event.ts;
  try {
    const threadMessagesResponse = await client.conversations.replies({
      channel: event.channel,
      ts: threadTs,
    });
    const threadMessages = threadMessagesResponse.messages;

    if (threadMessages) {
      const mentionMessages = threadMessages.reduce(
        (acc: Array<{ role: 'user' | 'assistant'; content: string }>, message) => {
          if (message.text?.includes(`<@${slackBotId}>`) || message.text?.includes(`<@${message.user}>`)) {
            const role = message.user === slackBotId ? OPEN_AI_ROLE_TYPE.assistant : OPEN_AI_ROLE_TYPE.user;
            acc.push({ role: role, content: message.text });
          }
          return acc;
        },
        [],
      );
      console.log('mentionMessages', mentionMessages);
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

  if (!env.SLACK_BOT_TOKEN) {
    console.error(' SLACK_BOT_TOKEN are not set in the environment variables');
    process.exit(1);
  }
  slackBotId = await getSlackBotId(app, env.SLACK_BOT_TOKEN);

  console.log('⚡️ Bolt app is running!');
})();
