import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

async function testAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.error('Please set a valid GEMINI_API_KEY in .env');
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const content = "The solar system consists of the Sun and everything that orbits it, including eight planets, their moons, and other objects like asteroids and comets.";
  
  const promptText = `
    You are an expert teacher grading a student's assignment.
    Assignment Content: ${content}
    
    Evaluate the submission based on accuracy, completeness, and grammar.
    Provide a score out of 10 and concise feedback.
    Respond ONLY in JSON format like this:
    {
      "score": number,
      "feedback": "string"
    }
  `;

  try {
    console.log('Testing Gemini AI with sample content...');
    const result = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ role: 'user', parts: [{ text: promptText }] }]
    });
    
    const responseText = result.text;
    console.log('Raw AI Response:', responseText);
    
    const aiResult = JSON.parse(responseText.replace(/```json|```/g, "").trim());
    console.log('Parsed Result:', aiResult);
    
    if (typeof aiResult.score === 'number' && typeof aiResult.feedback === 'string') {
      console.log('✅ AI Check works perfectly!');
    } else {
      console.log('❌ AI Result structure is unexpected.');
    }
  } catch (error) {
    console.error('❌ AI Check failed:', error);
  }
}

testAI();
