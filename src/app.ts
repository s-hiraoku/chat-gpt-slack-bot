import { App } from '@slack/bolt';
import { SlackFiles } from './types';
import { getSlackBotId } from './slack';
import { sanitizeText, validateFiles } from './utils';
import { initOpenAI } from './openai';
import { REVIEW_REQUEST_MESSAGE, SLACK_EMPTY_MESSAGE_REPLY } from './messages/slack';
import axios from 'axios';
import { getEnvVariables, processThreadMessages, replyWithEventTS } from './helpers';

let slackBotId: string | undefined;

const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, OPENAI_API_KEY, OPENAI_MODEL } = getEnvVariables();

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
    if (!('files' in event && event.files && validateFiles(event.files as SlackFiles))) {
      await replyWithEventTS(say, 'Attached file is invalid.', eventTS);
      return;
    }
    try {
      const fileUrl = (event.files as SlackFiles)[0].url_private;
      const response = await axios.get(fileUrl, {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
        responseType: 'arraybuffer',
      });
      const fileData = response.data;
      console.log('fileData', fileData);
    } catch (err) {
      console.error(err);
      await replyWithEventTS(say, 'An error occurred while downloading the file.', eventTS);
    }

    return;
  }

  processThreadMessages(client, event.channel, threadTs, user, slackBotId, say);
});

(async () => {
  await app.start(process.env.PORT || 3000);

  slackBotId = await getSlackBotId(app, SLACK_BOT_TOKEN);

  await initOpenAI(OPENAI_API_KEY, OPENAI_MODEL);

  console.log('⚡️ Bolt app is running!');
})();
