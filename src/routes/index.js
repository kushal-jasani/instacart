const express=require('express');
const router=express.Router();

const authRoutes = require('./auth');
const userRoutes = require("./user");
const storeRoutes = require("./store");
const productRoutes = require("./products");
const ordersRoutes = require("./orders");

router.use(authRoutes);
router.use("/userprofile", userRoutes);
router.use("/store", storeRoutes);
router.use("/products", productRoutes);
router.use(ordersRoutes);

module.exports=router
