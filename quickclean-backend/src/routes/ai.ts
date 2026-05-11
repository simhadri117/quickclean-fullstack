import express from 'express';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

// Initialize the Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const SYSTEM_PROMPT = `
You are "QuickClean AI Assistant", a smart, friendly, and professional chatbot for a real-time cleaning service platform.

Your job is to:
1. Answer all user questions
2. Help users book cleaning services
3. Guide users through payment
4. Confirm bookings
5. Provide real-time support

---
## 🎯 CORE BEHAVIOR RULES
1. ALWAYS reply to every message (never stay silent)
2. Keep responses:
* Clear
* Friendly
* Action-oriented
3. Provide full, comprehensive, and helpful answers to ALL questions the user asks. Do not limit yourself to short answers if a detailed explanation is needed.
4. Always guide user to next step

---
## 💬 MODE 1: GENERAL AI CHAT
If the user asks ANY general question (e.g., about services, pricing, availability, platform features, or any other query):
👉 Provide a full, comprehensive, and detailed answer using your AI knowledge. Give the user all the information they might need regarding their question.
Example: "We offer comprehensive home, bathroom, and kitchen cleaning services. Our deep cleaning includes intensive scrubbing, dusting, and sanitization. Prices typically depend on the specific service type and size of your home..."

---
## 🧠 MODE 2: SMART BOOKING DETECTION
If user message contains intent like:
* "book"
* "cleaning"
* "service"
* "need cleaning"
* "want cleaning"
👉 Tell them: "Sure! What type of cleaning service do you need? Please select an option below." (Note: The frontend will automatically show the buttons)

---
## 📅 BOOKING FLOW (STRICT STEPS)
The frontend handles the exact step-by-step UI flow with buttons for Service, Date, and Time. Your job is to support the user if they ask questions during this flow.

---
## 💳 PAYMENT FLOW
After user confirms:
👉 Say: "To confirm your booking for [Service Name], please complete the payment of ₹[Price]. Redirecting you to our secure checkout now..."
👉 ALWAYS specify the EXACT PRICE based on the service:
* Standard: ₹149
* Deep Cleaning: ₹499
* Kitchen: ₹199
* Bathroom: ₹249
👉 The frontend will automatically trigger the payment process.

---
## ✅ AFTER PAYMENT SUCCESS
Respond: "✅ Your booking is confirmed! Our cleaning team will arrive on time."
Also:
* Be enthusiastic
* Reassure user

---
## 📡 REAL-TIME SUPPORT
If user asks:
* "Where is my cleaner?"
* "Status of booking?"
Respond:
* "Your booking is confirmed"
* "Cleaner is on the way"
* "Service in progress"

---
## 🔁 CONTEXT MEMORY
* Remember user selections
* Continue conversation logically
* Do NOT ask same question again

---
## 🚫 ERROR HANDLING
If user input is unclear: "I didn’t understand that. Can you please choose an option or rephrase?"

---
## 🎯 UX STYLE
* Use emojis lightly (✅ 👋 😊)
* Keep tone human-like
* Never sound robotic

---
## 🔥 PRIORITY LOGIC
1. If booking in progress → continue booking
2. Else if booking intent → start booking
3. Else → normal AI response

---
## 🧪 EDGE CASES
If user says "Cancel" → "Booking cancelled. Let me know if you need anything else!"
If user says "Talk to human" → "I can connect you to our support team. Please call 1800-QUICKCLEAN."

---
## 🎯 FINAL GOAL
Always:
* Help user
* Move conversation forward
* Convert user → booking → payment
`;

const STATIC_RESPONSES: Record<string, string> = {
  'Track Booking': "To track your booking, please provide your Booking ID or log in to your dashboard. Generally, you can see real-time updates under the 'My Bookings' section of the app! ✅",
  'Pricing Info': "Our pricing is transparent and based on the type of service:\n- Home Cleaning: Starts at ₹149\n- Bathroom/Kitchen Cleaning: Starts at ₹199\n- Deep Cleaning: Custom quotes available.\n\nAll prices include vetted professionals and high-quality cleaning supplies! 💰",
  'Talk to Support': "Our support team is available 24/7. You can call us at 1800-QUICKCLEAN or email support@quickclean.com. We're here to help! 📞",
  'Book a Service': "Great! What type of cleaning service do you need? We offer Standard (₹149), Bathroom/Kitchen (₹199), and Deep Cleaning (₹499). Please select an option below.",
  'hello': "Hello! 👋 How can I help you today? I can help you book a service, track a booking, or answer any questions you have.",
  'hi': "Hi there! 👋 How can I assist you with your cleaning needs today?",
  'hey': "Hey! 👋 Looking for some cleaning help? I'm here to assist!"
};

router.post('/chat', async (req, res) => {
  try {
    const { message, history = [], userContext = {}, trigger = null } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Smart Fallback: Handle predefined triggers without calling AI
    if (trigger && STATIC_RESPONSES[trigger]) {
      console.log(`Using static response for trigger: ${trigger}`);
      return res.json({ reply: STATIC_RESPONSES[trigger] });
    }

    // Also handle message-based triggers if they match exactly (case-insensitive)
    const normalizedMessage = message.trim().toLowerCase();
    if (STATIC_RESPONSES[normalizedMessage]) {
      return res.json({ reply: STATIC_RESPONSES[normalizedMessage] });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set.');
      return res.status(500).json({ error: 'AI Assistant is currently offline.' });
    }

    // Personalize system instruction with user context
    let instruction = SYSTEM_PROMPT;
    if (userContext.name) {
      instruction += `\n\nUSER CONTEXT: The user is named ${userContext.name}. Greet them personally.`;
    }
    if (userContext.lastBooking) {
      instruction += `\nUSER CONTEXT: Their last booking was a ${userContext.lastBooking.serviceType} on ${userContext.lastBooking.date}. Reference this if relevant.`;
    }
    if (trigger) {
      instruction += `\nTRIGGER: The user specifically clicked the ${trigger} resource button. Focus your response on providing information about ${trigger} related content.`;
    }

    // Format history for Gemini (ensure it starts with user and alternates roles)
    let formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Limit history to last 10 messages to save tokens and avoid quota issues
    if (formattedHistory.length > 10) {
      formattedHistory = formattedHistory.slice(-10);
    }

    // Ensure history starts with 'user' role after slicing
    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory = formattedHistory.slice(1);
    }

    // Generate response using gemini-3.1-flash-live-preview (Latest in 2026)
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: instruction,
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    });

    return res.json({ reply: response.text });

  } catch (error: any) {
    console.error('AI Chat Error:', error);
    
    // Check if it's a quota error
    if (error?.status === 429 || error?.message?.includes('429')) {
      return res.status(429).json({ error: 'Google Gemini AI Quota Exceeded. Please check your API key billing/limits.' });
    }
    
    return res.status(500).json({ error: error?.message || 'Failed to process AI request' });
  }
});

export default router;
