import { App, SayFn } from '@slack/bolt';
import { OpenAIMessages } from './types';
import { covertSlackMessageToOpenAIMessage, getSlackBotId } from './slack';
import { getEnv, sanitizeText } from './utils';
import { initOpenAI, sendMessage } from './openai';
import { REVIEW_REQUEST_MESSAGE, SLACK_EMPTY_MESSAGE_REPLY } from './messages/slack';

const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, OPENAI_API_KEY, OPENAI_MODEL } = getEnv();

if (!SLACK_BOT_TOKEN || !OPENAI_API_KEY) {
  console.error(' SLACK_BOT_TOKEN or OPENAI_API_KEY are not set in the environment variables');
  process.exit(1);
}

let slackBotId: string | undefined;

const replyWithEventTS = async (say: SayFn, text: string, eventTS: string) => {
  await say({
    text,
    thread_ts: eventTS,
  });
};

const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET,
});

app.event('app_mention', async ({ event, client, say }) => {
  const { text: currentText, ts: eventTS, user } = event;
  const threadTs = event.thread_ts ? event.thread_ts : event.ts;

  const currentMessage = sanitizeText(currentText);
  console.log('Current message:', currentMessage);

  if (!currentMessage) {
    await replyWithEventTS(say, SLACK_EMPTY_MESSAGE_REPLY, eventTS);
    return;
  }
  if (currentMessage === REVIEW_REQUEST_MESSAGE) {
    await replyWithEventTS(say, 'Please send the code to be reviewed.', eventTS);
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
      text: `<@${user}>\n A defect has occurred. Please contact the developer.\n\n${err}`,
      thread_ts: threadTs,
    });
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);

  slackBotId = await getSlackBotId(app, SLACK_BOT_TOKEN);

  await initOpenAI(OPENAI_API_KEY, OPENAI_MODEL);

  console.log('⚡️ Bolt app is running!');
})();
