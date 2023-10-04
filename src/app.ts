import { App } from '@slack/bolt';
import { load } from 'ts-dotenv';
import { Env } from './types';
import { initOpenAI } from './openai';

let env: Partial<Env>;
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

app.event('app_mention', async ({ event, say }) => {
  const threadTs = event.thread_ts ? event.thread_ts : event.ts;
  await say({
    text: `Hello, <@${event.user}>. You mentioned me with: ${event.text}`,
    thread_ts: threadTs,
  });
});

initOpenAI(env.OPENAI_API_KEY);

(async () => {
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
