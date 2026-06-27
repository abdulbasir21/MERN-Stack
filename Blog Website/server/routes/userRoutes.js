const express = require("express");
const {
  getAllUsers,
  registerController,
  loginController,logout
} = require("../controllers/userContoller");

//router object
const router = express.Router();

// GET ALL USERS || GET
router.get("/all-users", getAllUsers);

// CREATE USER || POST
router.post("/register", registerController);

//LOGIN || POST
router.post("/login", loginController);

//Logout
router.get("/logout", logout);

module.exports = router;
