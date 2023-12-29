import nodeMailer from "nodemailer";
import logger from "../common/logger";

const transporter = nodeMailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendMail = async (credentials: any) => {
  try {
    let info = await transporter.sendMail({
      from: process.env.EMAIL,
      to: credentials.to,
      subject: credentials.intent,
      html: ``,
    });
    return info;
  } catch (error) {
    logger.error({ issue: "email service down", error });
  }
};
