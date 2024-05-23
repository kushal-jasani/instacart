const express=require('express');
const router=express.Router();

const authRoutes = require('./auth');
const userRoutes = require("./user");

router.use(authRoutes);
router.use("/userprofile", userRoutes);

module.exports=router
