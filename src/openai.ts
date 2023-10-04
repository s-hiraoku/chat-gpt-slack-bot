import { OpenAI } from 'openai';

async function main(openai: OpenAI) {
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: 'Say this is a test' }],
    model: 'gpt-4',
  });

  console.log(chatCompletion.choices);
}

export const initOpenAI = (openAIApiKey: string) => {
  const openai = new OpenAI({
    apiKey: openAIApiKey,
  });
  main(openai);
};
