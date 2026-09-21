const nodemailer = require("nodemailer");

let transporter;

// Initialize Ethereal fallback for testing
nodemailer.createTestAccount().then((testAccount) => {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.ethereal.email",
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || testAccount.user,
      pass: process.env.EMAIL_PASS || testAccount.pass,
    },
  });
}).catch(console.error);

const sendEmail = async (to, subject, text) => {
  try {
    // Wait for async init if needed
    let retries = 5;
    while (!transporter && retries > 0) {
      await new Promise(r => setTimeout(r, 200));
      retries--;
    }
    
    const info = await transporter.sendMail({
      from: process.env.DEFAULT_FROM_EMAIL || '"Amaze Tracker" <noreply@amaze.com>',
      to,
      subject,
      text,
    });
    console.log("Email sent: %s", info.messageId);
    if (!process.env.EMAIL_HOST) {
      console.log("Test Email URL: %s", nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
};

module.exports = { sendEmail };
