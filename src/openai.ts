import { OpenAI } from 'openai';
import { Env, OpenAIMessages } from './types';
import { load } from 'ts-dotenv';

let env: Partial<Env>;
try {
  env = load({
    OPENAI_API_KEY: String,
  });
} catch (err) {
  console.error('Failed to load environment variables', err);
  process.exit(1);
}

if (!env.OPENAI_API_KEY) {
  console.error(' OPENAI_API_KEY are not set in the environment variables');
  process.exit(1);
}

const options = {
  apiKey: env.OPENAI_API_KEY,
};

const openai = new OpenAI(options);

let conversationHistory: OpenAIMessages = [{ role: 'system', content: 'You are a helpful assistant.' }];

async function sendMessage(message: string) {
  // Add new user message to the conversation history
  conversationHistory.push({ role: 'user', content: message });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: conversationHistory,
    });

    // Extracting the model's reply
    const reply = response.choices[0].message.content;

    // Add model's reply to the conversation history
    if (reply) {
      conversationHistory.push({ role: 'assistant', content: reply });
    }

    console.log('Model reply:', reply);
  } catch (error) {
    if (typeof error === 'object' && error !== null) {
      const err = error as { response?: { data: unknown }; message?: string };
      if ('response' in err) {
        console.error('Error:', err.response?.data);
      } else if ('message' in err) {
        console.error('Error:', err.message);
      }
    }
  }
}
