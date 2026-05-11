import { google } from 'googleapis';

const calendar = google.calendar('v3');

// These should be set in .env
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const auth = new google.auth.JWT(
  GOOGLE_CLIENT_EMAIL,
  null as any,
  GOOGLE_PRIVATE_KEY,
  SCOPES
);

export const createCleaningEvent = async (bookingData: {
  id: string;
  serviceName: string;
  startTime: string; // ISO string
  durationMins: number;
  userEmail: string;
  address: string;
}) => {
  try {
    const start = new Date(bookingData.startTime);
    const end = new Date(start.getTime() + bookingData.durationMins * 60000);

    const event = {
      summary: `✨ QuickClean: ${bookingData.serviceName}`,
      location: bookingData.address,
      description: `Your professional cleaning is scheduled. Booking ID: ${bookingData.id}`,
      start: {
        dateTime: start.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      attendees: [
        { email: bookingData.userEmail }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const response = await calendar.events.insert({
      auth,
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all', // This sends the email invitation!
    });

    console.log(`[Google Calendar] Event created: ${response.data.htmlLink}`);
    return { success: true, link: response.data.htmlLink };
  } catch (error: any) {
    console.error('[Google Calendar] Error creating event:', error.message);
    return { success: false, error: error.message };
  }
};
