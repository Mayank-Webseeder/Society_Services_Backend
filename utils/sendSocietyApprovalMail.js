const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // set in .env
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendSocietyApprovalMail = async (society) => {
  const mailOptions = {
    from: '"Velre" <no-reply@velre.com>',
    to: society.email,
    subject: "Your Society Registration is Approved",
    html: `
      <p>Hi ${society.username},</p>
      <p>Your society registration has been approved by the admin.</p>
      <p>You can now log in and begin posting jobs.</p>
      <br/>
      <p>Regards,<br/>Velre Team</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
