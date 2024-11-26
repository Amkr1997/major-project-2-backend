const mongoose = require("mongoose");

const user = new mongoose.Schema(
  {
    name: String,
    userName: String,
    email: String,
    password: String,
    bio: String,
    displayPic: String,
    websiteLink: String,
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    follower: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    postsLiked: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", user);
module.exports = User;
