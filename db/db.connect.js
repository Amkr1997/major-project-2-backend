require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");

const initialisation = async () => {
  try {
    const connectDb = await mongoose.connect(process.env.MONGO_URI);

    if (connectDb) {
      console.log("Connected to mongoDB");
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = { initialisation };
