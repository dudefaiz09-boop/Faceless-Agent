import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';

export const GEMINI_MODEL = "gemini-2.0-flash-exp";
export const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "mock-key" 
});

export const sanitizeForAI = (text: string) => {
  return text.replace(/[^\w\s.,!?-]/gi, '').substring(0, 1000);
};
