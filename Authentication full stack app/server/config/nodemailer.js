import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
 host: 'smtp-relay.brevo.com',
 port: 587,
 auth: {
   user: process.env.SMTP_USER,
   pass: process.env.SMTP_PASSWORD
 }
});

export default transporter;
