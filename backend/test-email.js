import 'dotenv/config';
import sendEmail from './src/utils/email.js';

async function testEmail() {
  console.log('--- Email Test Start ---');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);

  try {
    await sendEmail({
      email: process.env.SMTP_USER, // Send to self
      subject: 'Tectra Email Test',
      message: 'If you are reading this, your email configuration is correct.',
      html: '<h1>Email Configuration Status: <span style="color: green;">OPERATIONAL</span></h1>'
    });
    console.log('--- Email Test Successful ---');
  } catch (error) {
    console.error('--- Email Test Failed ---');
    console.error(error);
  }
}

testEmail();
