import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

async function testChatbotAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const roles = ['student', 'teacher', 'admin'];
  const queries = [
    "I need help with my algebra homework about quadratic equations.",
    "Can you suggest a lesson plan for 10th grade biology on photosynthesis?",
    "Show me a summary of school performance for this term."
  ];

  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const query = queries[i];

    console.log(`\n--- Testing for Role: ${role} ---`);
    console.log(`Query: ${query}`);

    const roleContexts: Record<string, string> = {
      student: "You are a helpful student assistant. Help with homework, explain concepts simply, remind them about assignments, and be encouraging.",
      teacher: "You are a teacher's aide. Help with lesson planning, grading rubrics, classroom management tips, and administrative tasks.",
      admin: "You are a school administration consultant. Provide insights on analytics, coordination, staff management, and operational efficiency."
    };

    const systemPrompt = roleContexts[role];
    const fullPrompt = `
      System Instructions: ${systemPrompt}
      User Role: ${role}
      User Context: Class 10A
      
      Question: ${query}
    `;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
      });
      
      console.log(`AI Response: ${result.text.substring(0, 150)}...`);
      console.log('✅ Success');
    } catch (error) {
      console.error('❌ Failed:', error);
    }
  }
}

testChatbotAI();
