import { AppMentionEvent, SayFn } from '@slack/bolt';
import { downloadFile, getEnv, validateFiles } from './utils';
import { covertSlackMessageToOpenAIMessage } from './slack';
import { OPEN_AI_ROLE_TYPE, OpenAIMessages, SlackFiles } from './types';
import { WebClient } from '@slack/web-api';
import { getChatGPTResponse } from './openai';
import admZip from 'adm-zip';
import { OPENAI_RESTORE_CODE_MESSAGE } from './messages';

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

const DIFF_FILES_DIR = 'git-diff-files';
export const processReviewCode = async (
  event: AppMentionEvent,
  eventTS: string,
  slackBotToken: string,
  say: SayFn,
): Promise<void> => {
  if (!('files' in event && event.files && validateFiles(event.files as SlackFiles))) {
    await replyWithEventTS(say, 'Attached file is invalid.', eventTS);
    return;
  }
  const fileUrl = (event.files as SlackFiles)[0].url_private;
  const zipFile = await downloadFile(fileUrl, slackBotToken);
  const zip = new admZip(zipFile);
  const zipEntries = zip.getEntries();

  const topDirectoryName = zipEntries[0].entryName.split('/')[0];
  if (topDirectoryName !== DIFF_FILES_DIR) {
    await replyWithEventTS(say, 'Invalid directory name for attachment.', eventTS);
    return;
  }

  const diffDirectoryNames = zipEntries
    .filter((entry) => entry.isDirectory)
    .map((entry) => entry.entryName.split('/')[1])
    .filter((name) => name !== '');

  for (const diffDirectoryName of diffDirectoryNames) {
    const diffFileText = zip.readAsText(`${DIFF_FILES_DIR}/${diffDirectoryName}/${diffDirectoryName}.diff`);
    const originalFileNames = zipEntries
      .filter(
        (entry) =>
          entry.entryName.startsWith(`${DIFF_FILES_DIR}/${diffDirectoryName}/`) &&
          !entry.isDirectory &&
          `${DIFF_FILES_DIR}/${diffDirectoryName}/${diffDirectoryName}.diff` !== entry.entryName,
      )
      .map((entry) => entry.entryName.split('/').slice(2).join('/'));

    const originalFileTexts = originalFileNames.map((originalFileName) =>
      zip.readAsText(`${DIFF_FILES_DIR}/${diffDirectoryName}/${originalFileName}`),
    );

    const content = createReviewCodeRestorePrompt(diffFileText, originalFileTexts);
    try {
      const result = await say(`レビュー対象の${diffDirectoryName}のコードを復元します。`);
      const reply = await getChatGPTResponse([{ role: OPEN_AI_ROLE_TYPE.user, content }]);

      if (reply) {
        await say({ text: reply, thread_ts: result.ts });
      }
    } catch (error) {
      console.error('Error sending content:', error);
    }
  }
};

const createReviewCodeRestorePrompt = (diffFileText: string, baseFileTexts: string[]): string => {
  return `${OPENAI_RESTORE_CODE_MESSAGE}\n
  ------------------------------------------- diff file -------------------------------------------\n
  ${diffFileText}\n
  ------------------------------------------- original file -------------------------------------------\n
  ${baseFileTexts.join('\n')}
  `;
};
