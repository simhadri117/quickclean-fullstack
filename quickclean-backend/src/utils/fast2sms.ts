import axios from 'axios';

export const sendFast2SMS = async (phone: string, otp: string) => {
  const apiKey = process.env.FAST2SMS_KEY;
  if (!apiKey) {
    console.log('⚠️ Fast2SMS key not found. Falling back to Mock SMS.');
    return false;
  }

  try {
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'otp',
      variables_values: otp,
      numbers: phone,
    }, {
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const data = response.data as any;
    if (data.return) {
      console.log(`✅ Real SMS sent to ${phone} via Fast2SMS`);
      return true;
    } else {
      console.error('❌ Fast2SMS error:', data.message);
      return false;
    }
  } catch (error: any) {
    if (error.response && error.response.data && error.response.data.status_code === 996) {
      console.warn('⚠️ Fast2SMS: Account verification/DLT required for real OTP. Falling back to Log.');
    } else {
      console.error('❌ Fast2SMS request failed:', error.message);
    }
    return false;
  }
};
