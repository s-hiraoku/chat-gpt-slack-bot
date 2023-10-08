import { App } from '@slack/bolt';
import { OpenAIMessages } from './types';
import { covertSlackMessageToOpenAIMessage, getSlackBotId } from './slack';
import { EMPTY_STRING, getEnv, sanitizeText } from './utils';
import { initOpenAI, sendMessage } from './openai';
import { REVIEW_REQUEST_MESSAGE, SLACK_EMPTY_MESSAGE_REPLY } from './messages/slack';

let slackBotId: string | undefined;
const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, OPENAI_API_KEY, OPENAI_MODEL } = getEnv();

const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET,
});

app.event('app_mention', async ({ event, client, say }) => {
  const threadTs = event.thread_ts ? event.thread_ts : event.ts;

  const currentMessage = sanitizeText(event.text);
  console.log('Current message:', currentMessage);

  if (currentMessage === EMPTY_STRING) {
    await say({
      text: SLACK_EMPTY_MESSAGE_REPLY,
      thread_ts: event.ts,
    });
    return;
  }
  if (currentMessage === REVIEW_REQUEST_MESSAGE) {
    await say({
      text: 'Please send the code to be reviewed.',
      thread_ts: event.ts,
    });
    return;
  }

  try {
    const threadMessagesResponse = await client.conversations.replies({
      channel: event.channel,
      ts: threadTs,
    });
    const threadMessages = threadMessagesResponse.messages;

    if (threadMessages && slackBotId) {
      // Set Conversation history to mentionMessages.
      const mentionMessages = covertSlackMessageToOpenAIMessage(threadMessages, slackBotId);
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
