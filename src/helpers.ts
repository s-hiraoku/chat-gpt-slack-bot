import { AppMentionEvent, SayFn } from '@slack/bolt';
import { downloadFile, getEnv, validateFiles } from './utils';
import { covertSlackMessageToOpenAIMessage } from './slack';
import { OpenAIMessages, SlackFiles } from './types';
import { WebClient } from '@slack/web-api';
import { getChatGPTResponse } from './openai';

export const getEnvVariables = () => {
  const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, OPENAI_API_KEY, OPENAI_MODEL } = getEnv();

  if (!SLACK_BOT_TOKEN || !OPENAI_API_KEY) {
    console.error(' SLACK_BOT_TOKEN or OPENAI_API_KEY are not set in the environment variables');
    process.exit(1);
  }

  return {
    SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET,
    OPENAI_API_KEY,
    OPENAI_MODEL,
  };
};

export const replyWithEventTS = async (say: SayFn, text: string, eventTS: string) => {
  await say({
    text,
    thread_ts: eventTS,
  });
};

export const processThreadMessages = async (
  client: WebClient,
  channel: string,
  threadTs: string,
  user: string | undefined,
  slackBotId: string | undefined,
  say: SayFn,
) => {
  try {
    const threadMessagesResponse = await client.conversations.replies({
      channel,
      ts: threadTs,
    });
    const threadMessages = threadMessagesResponse.messages;

    if (threadMessages && slackBotId) {
      const mentionMessages = covertSlackMessageToOpenAIMessage(threadMessages, slackBotId);
      console.log('mentionMessages', mentionMessages);
      const reply = await getChatGPTResponse(mentionMessages as OpenAIMessages);
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
    throw err;
  }
};

export const processReviewCode = async (event: AppMentionEvent, eventTS: string, slackBotToken: string, say: SayFn) => {
  if (!('files' in event && event.files && validateFiles(event.files as SlackFiles))) {
    await replyWithEventTS(say, 'Attached file is invalid.', eventTS);
    return;
  }
  const fileUrl = (event.files as SlackFiles)[0].url_private;
  const zipFile = await downloadFile(fileUrl, slackBotToken);
};
