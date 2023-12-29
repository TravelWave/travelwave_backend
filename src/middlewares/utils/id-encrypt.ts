import crypto from "crypto";

const algorithm = "aes-256-cbc";
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

export const encryptId = (Id: String) => {
  let cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(Id.toString(), "hex", "hex");

  return encrypted + cipher.final("hex");
};

export const decryptId = (Id: String) => {
  let decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(Id.toString(), "hex", "hex");

  return decrypted + decipher.final("hex");
};
