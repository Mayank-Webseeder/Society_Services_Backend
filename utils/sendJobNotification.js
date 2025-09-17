const nodemailer = require("nodemailer");

exports.sendJobNotification = async (vendor, jobDetails) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // or SES, SendGrid
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: '"YourPlatform" <your@email.com>',
    to: vendor.email,
    subject: `New Job Alert: ${jobDetails.title}`,
    html: `
      <p>Hi ${vendor.name},</p>
      <p>A new ${jobDetails.category} job was posted near you.</p>
      <p><strong>${jobDetails.title}</strong></p>
      <p>${jobDetails.description}</p>
      <p>Location: ${jobDetails.location}</p>
      <a href="https://yourdomain.com/vendor/jobs">View & Apply</a>
    `,
  };

  await transporter.sendMail(mailOptions);
};
