const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listModels() {
  try {
    const ai = new GoogleGenAI({});
    // The @google/genai package might have a different way to list models
    // Let's see if we can find it.
    console.log('AI object:', Object.keys(ai));
    if (ai.models) {
        console.log('AI.models keys:', Object.keys(ai.models));
        // Try to list models if possible
        try {
            const models = await ai.models.list();
            console.log('Models:', JSON.stringify(models, null, 2));
        } catch (e) {
            console.log('Error listing models:', e.message);
        }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

listModels();
