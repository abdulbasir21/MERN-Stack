// lib/email.js — Nodemailer email notifications
// Install: npm install nodemailer
// Set env: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
// Required ENV:
// EMAIL_HOST=smtp.gmail.com
// EMAIL_PORT=587
// EMAIL_USER=your_email@gmail.com
// EMAIL_PASS=your_gmail_app_password
// EMAIL_FROM="MedLink <noreply@medlink.com>"

// lib/email.js — Nodemailer with Brevo SMTP

import nodemailer from "nodemailer";

const isEmailConfigured =
  process.env.EMAIL_USER && process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.EMAIL_PORT || 587),
  secure: false, // 587 = false
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify connection
if (isEmailConfigured) {
  transporter.verify((error) => {
    if (error) {
      console.error("❌ Brevo SMTP connection failed:", error.message);
    } else {
      console.log("✅ Brevo SMTP ready");
    }
  });
}

// Shared email sender
async function sendEmail({ to, subject, html }) {
  if (!isEmailConfigured) {
    console.warn("⚠️ Email not configured. Skipping email send.");
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
  }
}

// Appointment Confirmation
export async function sendAppointmentConfirmation({
  to,
  patientName,
  doctorName,
  date,
  time,
}) {
  await sendEmail({
    to,
    subject: "Appointment Confirmed — MedLink",
    html: `
      <h2>Appointment Confirmed</h2>
      <p>Hi ${patientName},</p>

      <p>
        Your appointment with <strong>Dr. ${doctorName}</strong> has been booked.
      </p>

      <ul>
        <li><strong>Date:</strong> ${new Date(date).toDateString()}</li>
        <li><strong>Time:</strong> ${time}</li>
      </ul>

      <p>— MedLink Team</p>
    `,
  });
}

// Appointment Cancellation
export async function sendAppointmentCancellation({
  to,
  patientName,
  doctorName,
  date,
  time,
}) {
  await sendEmail({
    to,
    subject: "Appointment Cancelled — MedLink",
    html: `
      <h2>Appointment Cancelled</h2>
      <p>Hi ${patientName},</p>

      <p>
        Your appointment with Dr. ${doctorName} on ${new Date(date).toDateString()} at ${time} was cancelled.
      </p>

      <p>— MedLink Team</p>
    `,
  });
}

// Doctor Approval / Rejection
export async function sendDoctorApprovalNotification({
  to,
  doctorName,
  approved,
}) {
  await sendEmail({
    to,
    subject: approved
      ? "Account Approved — MedLink"
      : "Account Update — MedLink",

    html: approved
      ? `
        <h2>Welcome Dr. ${doctorName}</h2>
        <p>Your account has been approved.</p>
        <p>You can now start using MedLink.</p>
      `
      : `
        <h2>Account Update</h2>
        <p>Hi Dr. ${doctorName}, your application needs review.</p>
      `,
  });
}