const express = require("express");
const router = express.Router();
const storeController=require('../controller/store');

router.get('/categorylist',storeController.categoryFilter);
router.get('/category',storeController.getStoresByCategory);

module.exports=router;