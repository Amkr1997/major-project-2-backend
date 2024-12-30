const User = require("./models/user.model");
const Post = require("./models/post.model");
const { initialisation } = require("./db/db.connect");
const { uploadCloudinary } = require("./utils/cloudinary");
require("dotenv").config({ path: ".env" });

initialisation();

const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const cors = require("cors");
const multer = require("multer");
const { default: mongoose } = require("mongoose");
const corsOptions = {
  origin: "*",
  credentials: true,
  openSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    //const assetsPath = path.resolve(__dirname, "assets");
    return cb(null, "/tmp");
  },

  filename: function (req, file, cb) {
    return cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.get("/", (req, res) => res.send("Express started!"));

// Get All Posts
app.get("/api/posts", async (req, res) => {
  try {
    const allPosts = await Post.find().populate({
      path: "author",
      select: "name userName displayPic",
    });

    if (!allPosts) {
      return res
        .status(404)
        .json({ message: "Posts not found", success: false });
    }

    return res
      .status(201)
      .json({ message: "Posts found", allPosts, success: true });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
});

// Add a Post
app.post(
  "/api/user/post",
  upload.fields([{ name: "imgContent", maxCount: 1 }]),
  async (req, res) => {
    const { title, textContent, likes, author, comments } = req.body;

    try {
      let postImgUrl = null; // initialise img url as null.

      // Getting local path of image,
      const postLocalPath = req.files?.imgContent?.[0]?.path;

      if (postLocalPath) {
        // profile image object uploaded in cloudinary
        const postImg = await uploadCloudinary(postLocalPath);

        if (!postImg) {
          return res.status(400).json({ message: "Failed to upload image" });
        }

        postImgUrl = postImg.url; //setting image url to post image.
      }

      if (!textContent && !postImgUrl) {
        return res.status(400).json({
          message: "Post image or Post content is required",
          success: false,
        });
      }

      // Creating new post
      const newPost = new Post({
        textContent,
        imgContent: postImgUrl,
        likes,
        author,
        comments,
      });

      const savedPost = await newPost.save();

      if (!savedPost) {
        return res
          .status(404)
          .json({ message: "Failed to post!", success: false });
      }

      // updating users post array.
      const updateUsersPost = await User.findByIdAndUpdate(
        author,
        {
          $addToSet: { posts: newPost._id },
        },
        { new: true }
      );

      if (!updateUsersPost) {
        await Post.findByIdAndDelete(newPost._id);

        return (
          res.status(500),
          express.json({
            message: "Failed to update user post",
            success: false,
          })
        );
      }

      return res.status(201).json({
        message: "Post saved successfully and user's post updated as well",
        success: true,
        savedPost,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: "Internal server error", success: false });
    }
  }
);

// Get a single post
app.get("/api/posts/:postId", async (req, res) => {
  const dataId = req.params.postId;

  try {
    const singlePost = await Post.findById(dataId);

    if (!singlePost) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }
    return res
      .status(201)
      .json({ message: "Post found", singlePost, success: true });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
});

// Update a single post
app.post(
  "/api/posts/edit/:postId",
  upload.fields([{ name: "imgContent", maxCount: 1 }]),
  async (req, res) => {
    const dataId = req.params.postId;
    const textDatatToUpdate = req.body.textContent;
    const imgPathToUpdate = req.files?.imgContent?.[0]?.path;

    try {
      let newImgPath;

      if (imgPathToUpdate) {
        const updateImg = await uploadCloudinary(imgPathToUpdate);

        if (!updateImg) {
          return res
            .status(400)
            .json({ message: " Failed to update image", success: false });
        }

        newImgPath = updateImg.url;
      }

      const datatToUpdate = {}; // creating an empty obejct so I can add both data inside it.

      if (textDatatToUpdate) {
        datatToUpdate.textContent = textDatatToUpdate;
      }

      if (imgPathToUpdate) {
        datatToUpdate.imgContent = newImgPath;
      }

      const updatedPost = await Post.findByIdAndUpdate(dataId, datatToUpdate, {
        new: true,
      });

      if (!updatedPost) {
        return res.status(404).json({ message: "Post can't get update" });
      }

      return res
        .status(201)
        .json({ message: "Post updated", updatedPost, success: true });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: "Internal server error", success: false });
    }
  }
);

// Delete a single post
app.delete("/api/:userId/posts/:postId", async (req, res) => {
  const postId = req.params.postId;
  const userId = req.params.userId;

  try {
    const foundUser = await User.findById(userId);
    const foundPost = await Post.findById(postId);

    if (!foundPost && !foundUser)
      return res.json({ message: "User or post not found", success: false });

    const deletedPost = await Post.findByIdAndDelete(postId);

    if (!deletedPost) {
      return res
        .status(404)
        .json({ message: "Failed to delete the post", success: false });
    }

    const updateUserPost = await User.findByIdAndUpdate(userId, {
      $pull: { posts: postId },
    });

    if (!updateUserPost) {
      // Adding post again using posts model
      const newPost = new Post(foundPost);
      await newPost.save();

      return res
        .status(404)
        .json({ message: "Failed to delete post", success: false });
    }

    return res.status(201).json({
      message: "Post deleted successfuly ",
      deletedPost,
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
});

// Like route
app.post("/api/:userId/like/:postId", async (req, res) => {
  const userId = req.params.userId;
  const postId = req.params.postId;

  try {
    const foundPost = await Post.findById(postId);

    if (!foundPost)
      return res
        .status(404)
        .json({ message: "post not found", success: false });

    const isLiked = foundPost.likes.includes(userId);

    if (!isLiked) {
      const likedPost = await Post.findByIdAndUpdate(
        postId,
        {
          $addToSet: { likes: userId },
        },
        { new: true }
      );

      const userWhoLiked = await User.findByIdAndUpdate(
        userId,
        {
          $addToSet: { postsLiked: postId },
        },
        { new: true }
      );

      return res.status(201).json({
        message: "Liked post",
        success: true,
        likedPost,
        userWhoLiked,
      });
    } else {
      const dislikedPost = await Post.findByIdAndUpdate(
        postId,
        {
          $pull: { likes: userId },
        },
        { new: true }
      );

      const userWhoDisliked = await User.findByIdAndUpdate(
        userId,
        {
          $pull: { postsLiked: postId },
        },
        { new: true }
      );

      return res.status(201).json({
        message: "Disliked post",
        success: true,
        dislikedPost,
        userWhoDisliked,
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
});

// Bookmarks route.
app.post("/api/:userId/bookmark/:postId", async (req, res) => {
  const userId = req.params.userId;
  const postId = req.params.postId;

  try {
    const foundUser = await User.findById(userId);
    const foundPost = await Post.findById(postId);

    if (!foundPost || !foundUser)
      return res
        .status(404)
        .json({ message: "user or post not found", success: false });

    isBookMarked = foundUser.bookmarks.includes(postId);

    if (isBookMarked) {
      await User.findByIdAndUpdate(userId, {
        $pull: { bookmarks: postId },
      });

      return res
        .status(201)
        .json({ message: "Removed post from bookmarks", success: true });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { bookmarks: postId },
    });

    return res
      .status(201)
      .json({ message: "Post bookmarked successfully", success: true });
  } catch (error) {
    console.log(error);
  }
});

// Get all Users.
app.get("/api/users", async (req, res) => {
  try {
    const allUsers = await User.find();

    if (!allUsers) {
      return res
        .status(404)
        .json({ message: "Failed to fetch all users", success: false });
    }

    return res
      .status(201)
      .json({ message: "All Users", allUsers, success: true });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
});

// Get users with name, dp and userName only.
app.get("/api/users/username", async (req, res) => {
  try {
    const allUsers = await User.find().select("name userName displayPic");

    if (!allUsers) {
      return res.status(404).json({
        message: "Failed to fetch all users with userName",
        success: false,
      });
    }

    return res
      .status(201)
      .json({ message: "All Users", allUsers, success: true });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
});

// Get a single user
app.get("/api/users/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const singleUser = await User.findById(userId);

    if (!singleUser) {
      return res
        .status(404)
        .json({ message: "Failed to fetch single user", success: false });
    }
    return res
      .status(201)
      .json({ message: "Found a single user", singleUser, success: true });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
});

// Update a user
app.post("/api/users/edit/:userId", async (req, res) => {
  const dataId = req.params.userId;
  const datatToUpdate = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(dataId, datatToUpdate, {
      new: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: "user can't get update", success: false });
    } else {
      return res
        .status(201)
        .json({ message: "User updated", updatedUser, success: true });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
});

// follow/following.
app.post("/api/:userId/follow/:followerId", async (req, res) => {
  const followingUserId = req.params.userId;
  const followerUserId = req.params.followerId;

  try {
    const followingUser = await User.findById(followingUserId);
    const followerUser = await User.findById(followerUserId);

    if (!followerUser)
      return res
        .status(404)
        .json({ message: "Follower doesn't exist", success: false });

    const isFollowing = followingUser.following.includes(followerUserId);

    if (isFollowing) {
      // Here unfollow the user
      await User.findByIdAndUpdate(followingUserId, {
        $pull: { following: followerUserId },
      });

      await User.findByIdAndUpdate(followerUserId, {
        $pull: { follower: followingUserId },
      });

      return res
        .status(201)
        .json({ message: "Unfollowed user", success: true });
    } else {
      // Here follow the user
      await User.findByIdAndUpdate(followingUserId, {
        $addToSet: { following: followerUserId },
      });

      await User.findByIdAndUpdate(followerUserId, {
        $addToSet: { follower: followingUserId },
      });

      return res.status(201).json({ message: "Followed user", success: true });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
});

// User registration.
app.post("/register", async (req, res) => {
  const { name, userName, email, password } = req.body;

  try {
    const alreadyUser = await User.findOne({ email });

    if (alreadyUser) {
      return res
        .status(404)
        .json({ message: "User already exists", success: false });
    }

    const newUser = new User({ name, userName, email, password });
    newUser.password = await bcrypt.hash(password, 10);
    const savedUser = await newUser.save();

    if (!savedUser) {
      return res.status(404).json({
        message: "Credentials not correct or are incomplete",
        success: false,
      });
    }

    return res.status(201).json({
      message: "You just got registered!",
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const verifyJWT = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decodedToken;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid Token" });
  }
};

// User Login.
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const loginUser = await User.findOne({ email });

    if (!loginUser) {
      return res
        .status(401)
        .json({ message: "Invalid user credentials", success: false });
    }

    const checkPass = await bcrypt.compare(password, loginUser.password);

    if (!checkPass)
      return res
        .status(401)
        .json({ message: "password is incorrect", success: false });

    const jwtToken = jwt.sign(
      {
        userId: loginUser._id,
        userPic: loginUser.displayPic,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "24h" }
    );

    return res.status(201).json({
      message: "You login successfully",
      success: true,
      jwtToken,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
});

// demo protected route.
app.get("/demoVerify", verifyJWT, (req, res) => {
  const loginUserId = req.user;
  res.json({ message: "welcome to profile page", loginUserId });
});

// fetch data of login user
app.get("/get/profile/data/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const profileData = await User.findById(userId)
      .select(
        "name userName email bio displayPic websiteLink posts following follower bookmarks postsLiked updatedAt createdAt"
      )
      .populate({
        path: "bookmarks",
        populate: {
          path: "bookmarks",
          select: "name userName displayPic",
        },
      })
      .populate({ path: "follower" })
      .populate({ path: "following" })
      .populate({
        path: "posts",
        populate: {
          path: "author",
          select: "name userName displayPic",
        },
      })
      .populate({ path: "postsLiked" });

    if (!profileData) {
      return res.status(404).json({ message: "cannot find data" });
    }

    return res.status(201).json({ message: "Found data", profileData });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log("Connected to server running at port", PORT);
});
