import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export const sendSMS = async (to: string, message: string) => {
  try {
    const response = await client.messages.create({
      body: message,
      from: fromPhone,
      to: to
    });
    console.log(`[Twilio] SMS sent successfully to ${to}. SID: ${response.sid}`);
    return { success: true, sid: response.sid };
  } catch (error: any) {
    console.error(`[Twilio] Failed to send SMS to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

export const sendArrivalAlert = async (to: string, cleanerName: string) => {
  const message = `⚡ QuickClean Alert: Your pro ${cleanerName} has arrived! Please be ready for service.`;
  return sendSMS(to, message);
};
