import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('[MAIL ERROR] Missing SMTP_USER or SMTP_PASS in environment variables.');
        throw new Error("Missing credentials for 'PLAIN' - Email configuration is incomplete.");
    }

    const isGmail = process.env.SMTP_HOST?.includes('gmail.com');
    
    const transportConfig = isGmail ? {
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        }
    } : {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    };

    const transporter = nodemailer.createTransport(transportConfig);
    const message = {
        from: `${process.env.FROM_NAME || 'Tectra Hub'} <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    console.log(`[MAIL] Attempting to send email to: ${options.email}`);

    try {
        const info = await transporter.sendMail(message);
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
};

export default sendEmail;
