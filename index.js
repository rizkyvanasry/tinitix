import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!apiKey) {
  console.error('Missing OPENAI_API_KEY. Add it to a .env file or your environment.');
  process.exit(1);
}

const client = new OpenAI({ apiKey });

const userPrompt = process.argv.slice(2).join(' ') || 'Say hello in one short sentence.';

const response = await client.chat.completions.create({
  model,
  messages: [{ role: 'user', content: userPrompt }],
  temperature: 0.7,
});

console.log(response.choices[0]?.message?.content ?? 'No response generated.');
