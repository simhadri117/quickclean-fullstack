const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listModels() {
  try {
    const ai = new GoogleGenAI({});
    const response = await ai.models.list();
    // The response itself might be the array or have a models property
    const models = response.models || response;
    if (Array.isArray(models)) {
        models.forEach(m => {
            if (m.name.includes('flash')) {
                console.log(m.name);
            }
        });
    } else {
        console.log('Response is not an array, keys:', Object.keys(response));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listModels();
