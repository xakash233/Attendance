import 'dotenv/config';
import sendEmail from './src/utils/email.js';

sendEmail({
  email: 'akash.2309911@gmail.com',
  subject: 'Test Email',
  message: 'This is a test email',
  html: '<p>This is a test email</p>'
}).then(() => {
  console.log('Email sent successfully');
  process.exit(0);
}).catch(e => {
  console.error('Email failed:', e);
  process.exit(1);
});
