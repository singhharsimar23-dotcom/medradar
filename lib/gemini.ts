import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const getModel = () => genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function parseJSON<T>(rawText: string): Promise<T> {
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned) as T;
}
