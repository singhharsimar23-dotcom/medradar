import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

export const getModel = () => genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export function parseJSON<T>(rawText: string): T | null {
  try {
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/) || cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.warn('parseJSON fallback caught:', err);
    return null;
  }
}
