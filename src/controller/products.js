const {
  findProductDetail,
  productExistsInSaved,
  insertIntoSaved,
  deleteFromSavedList,
  generatePerUnitPrice,
} = require("../repository/products");
const {
  generateResponse,
  sendHttpResponse,
} = require("../helper/response");
const { generateDiscountLabel } = require("../repository/store");

exports.getProductDetail = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId;
    const [productResults] = await findProductDetail(productId, userId);

    if (!productResults || productResults.length == 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "Product detail couldnt be found!!",
        })
      );
    }

    const product = productResults[0];

    const responseObject = {
      product_id: product.product_id,
      product_title: product.product_title,
      product_description: product.product_description,
      product_ingredients: product.product_ingredients,
      product_directions: product.product_directions,
      product_images: product.product_images,
      label:
        product.quantity === 1
          ? `${product.quantity_varient} ${product.unit}`
          : `${product.quantity} × ${product.quantity_varient} ${product.unit}`,
      actual_price: product.actual_price,
      selling_price: product.selling_price,
      ...(generatePerUnitPrice(product) !== null && {
        per_unit_price: generatePerUnitPrice(product),
      }),
      ...(product.discount_id !== null && {
        discount_label: generateDiscountLabel(product),
      }),
      is_saved: product.is_saved,
    };

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        data: responseObject,
        msg: "Product details fetched successfully✅",
      })
    );
  } catch (error) {
    console.log("Error while fetching Product Detail: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while fetching product detail👨🏻‍🔧",
      })
    );
  }
};

exports.addToSavedProduct = async (req, res, next) => {
  try {
    const productId = req.body.productId;
    const userId = req.user.userId;
    const [existsInFavourite] = await productExistsInSaved(productId, userId);
    if (existsInFavourite.length > 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: "Product already exists in saved products👀",
        })
      );
    }
    const [insertResult] = await insertIntoSaved(productId, userId);
    if (!insertResult) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: "Failed to add product to saved",
        })
      );
    }
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        statusCode: 200,
        status: "success",
        msg: "Product added to saved product list successfully❤️",
      })
    );
  } catch (error) {
    console.log("error while posting to saved products:", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while posting to saved products👨🏻‍🔧",
      })
    );
  }
};

exports.removeFromSavedProducts = async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const userId = req.user.userId;

    await deleteFromSavedList(productId, userId);

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        statusCode: 200,
        status: "success",
        msg: "Product removed from saved list successfully",
      })
    );
  } catch (error) {
    console.log("error while removeing product from saved list :", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while removeing product saved list👨🏻‍🔧",
      })
    );
  }
};
