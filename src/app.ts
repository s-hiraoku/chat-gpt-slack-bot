import { App } from '@slack/bolt';
import { load } from 'ts-dotenv';
import { Env } from './types';

let env: Partial<Env>;
try {
  env = load({
    SLACK_BOT_TOKEN: String,
    SLACK_SIGNING_SECRET: String,
    PORT: Number,
  });
} catch (err) {
  console.error('Failed to load environment variables', err);
  process.exit(1);
}

if (!env.SLACK_BOT_TOKEN || !env.SLACK_SIGNING_SECRET) {
  console.error('SLACK_BOT_TOKEN and/or SLACK_SIGNING_SECRET are not set in the environment variables');
  process.exit(1);
}

const app = new App({
  token: env.SLACK_BOT_TOKEN,
  signingSecret: env.SLACK_SIGNING_SECRET,
});

app.event('app_mention', async ({ event, say }) => {
  console.log('Mention event', event);
  await say(`Hello, <@${event.user}>. You mentioned me with: ${event.text}`);
});

(async () => {
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
