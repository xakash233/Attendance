import 'dotenv/config';
import sendEmail from './src/utils/email.js';

async function testEmail() {
  console.log('--- Email Test Start ---');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);

  try {
    await sendEmail({
      email: 'gokulavasan145@gmail.com', // Test specific target
      subject: 'Tectra Security Test',
      message: 'Testing verification dispatch to external node.',
      html: '<h1>Identity Verification Dispatch: <span style="color: blue;">TEST</span></h1>'
    });
    console.log('--- Email Test Successful ---');
  } catch (error) {
    console.error('--- Email Test Failed ---');
    console.error(error);
  }
}

testEmail();
