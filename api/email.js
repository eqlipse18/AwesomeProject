import { SendEmailCommand } from '@aws-sdk/client-ses';
import { sesClient } from './db.js';

export async function sendOTPEmail(toEmail, otpCode) {
  const params = {
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `
            <html>
              <body>
                <p>Hello,</p>
                <p>Your verification code is: <strong>${otpCode}</strong></p>
                <p>This code will expire in 5 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
                <p>Team DhirajKewat</p>
              </body>
            </html>
          `,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Your OTP Code - DhirajKewat',
      },
    },
    Source: 'no-reply@dhirajkewat.com.np', // Ye MAIL FROM domain hona chahiye
  };

  try {
    const result = await sesClient.send(new SendEmailCommand(params));
    console.log('Email sent:', result.MessageId);
    return result.MessageId;
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
}
