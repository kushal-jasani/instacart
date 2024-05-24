const express = require("express");
const router = express.Router();
const {checkLoggedIn}=require('../middleware/check_loggedin')
const {isAuth}=require('../middleware/is_auth')
const productController=require('../controller/products');

router.get('/:productId',checkLoggedIn,isAuth,productController.getProductDetail);
router.post('/addtosaved',checkLoggedIn,isAuth,productController.addToSavedProduct);
router.delete('/saved/remove/:productId',checkLoggedIn,isAuth,productController.removeFromSavedProducts);

module.exports=router;