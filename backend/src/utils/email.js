const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    // Handle transporter errors to prevent process crash
    transporter.on('error', (err) => {
        console.error('SMTP Transporter Error:', err);
    });

    const message = {
        from: `${process.env.FROM_NAME || 'Tectra Technologies'} <${process.env.SMTP_FROM}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    try {
        const info = await transporter.sendMail(message);
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
};

module.exports = sendEmail;
