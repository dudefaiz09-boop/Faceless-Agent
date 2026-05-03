import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  try {
    const pager = await ai.models.list();
    for await (const model of pager) {
      console.log(`${model.name} - ${model.displayName}`);
    }
  } catch (error) {
    console.error('Failed to list models:', error);
  }
}

listModels();
