const { v2: cloudinary } = require("cloudinary");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View APIs' above to copy your API Secret
});

const uploadCloudinary = async (filePath) => {
  try {
    if (!filePath) return "file path not found";
    // Upload the file on cloudinary
    const response = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully
    //console.log("file has been uploaded in cloudinary", response.url);
    fs.unlinkSync(filePath);
    return response;
  } catch (error) {
    fs.unlinkSync(filePath); // remove the locally saved file afte upload to cloudinary.
    return null;
  }
};

module.exports = { uploadCloudinary };
