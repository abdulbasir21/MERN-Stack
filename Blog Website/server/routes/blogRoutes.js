const express = require("express");
const {
  getAllBlogsController,
  createBlogController,
  updateBlogController,
  getBlogByIdController,
  deleteBlogController,
  userBlogControlller,
} = require("../controllers/blogControlller");
const authMiddleware = require("../middlewares/authMiddleware.js");


//router object
const router = express.Router();

//routes
// GET || all blogs
router.get("/all-blog", getAllBlogsController);

//POST || create blog
router.post("/create-blog",  authMiddleware, createBlogController);

//PUT || update blog
router.put("/update-blog/:id", authMiddleware,  updateBlogController);

//GET || SIngle Blog Details
router.get("/get-blog/:id", authMiddleware, getBlogByIdController);

//DELETE || delete blog
router.delete("/delete-blog/:id", authMiddleware, deleteBlogController);

//GET || user blog
router.get("/user-blog/:id", authMiddleware, userBlogControlller);

module.exports = router;
