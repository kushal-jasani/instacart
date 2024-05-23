const express=require('express');
const router=express.Router();

const authRoutes = require('./auth');
const userRoutes = require("./user");
const storeRoutes = require("./store");

router.use(authRoutes);
router.use("/userprofile", userRoutes);
router.use("/store", storeRoutes);

module.exports=router