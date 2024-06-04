import cloudinary from "./config/cloudinary";
import streamifier from "streamifier";
import fs from "fs";

// upload image to cloudinary
export const uploadImage = (image: any) => {
  const folder = "users";
  return cloudinary.v2.uploader
    .upload(image, {
      use_filename: true,
      unique_filename: false,
      folder: folder,
    })
    .then((result) => {
      fs.unlinkSync(image);
      return {
        message: "Success",
        url: result.url,
      };
    })
    .catch((error) => {
      fs.unlinkSync(image);
      throw error;
    });
};

export const streamUpload = (req: any, folder: string) => {
  return new Promise((resolve, reject) => {
    let stream = cloudinary.v2.uploader.upload_stream(
      {
        folder: folder,
      },
      (error, result) => {
        if (result) {
          resolve(result.secure_url);
        } else {
          reject(error);
        }
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(stream);
  });
};

// delete image from cloudinary
export const deleteImage = (image) => {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.destroy(image, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};
