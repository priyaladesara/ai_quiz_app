const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const gemini = new GoogleGenAI({});

async function generateContent(systemInstruction, userPrompt, responseSchema = null) {
    for (let i = 0; i < 3; i++) {
        try {
            const payload = {
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                config: {
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                },
            };

            if (responseSchema) {
                payload.config.responseMimeType = "application/json";
                payload.config.responseSchema = responseSchema;
            }

            const response = await gemini.models.generateContent(payload); 
            
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                throw new Error("AI response was empty or malformed.");
            }

            if (responseSchema) {
                return JSON.parse(text);
            }
            
            return text;

        } catch (error) {
            console.error(`Attempt ${i + 1} failed for AI generation: ${error.message}`);
            if (i === 2) throw new Error('AI service failed after multiple retries.');
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000)); 
        }
    }
}

module.exports = { generateContent };