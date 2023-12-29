import otpGenerator from "otp-generator";

export const generateOTP = (length: Number) =>
  otpGenerator.generate(length, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
