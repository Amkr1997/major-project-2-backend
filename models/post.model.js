const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: String,
    textContent: String,
    imgContent: String,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    comments: [
      {
        content: String,
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
