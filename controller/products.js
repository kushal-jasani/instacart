const { findProductDetail } = require("../repository/products");
const { generateResponse, sendHttpResponse } = require("../helper/response");

exports.getProductDetail=async(req,res,next)=>{
    try{
        const { productId } = req.params;

        const [productResults]=await findProductDetail(productId);

        if (!productResults|| productResults.length == 0) {
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
          let discountLabel = null;
        if (product.discount_id !== null) {
            if (product.discount === null) {
                discountLabel = `Buy ${product.buy_quantity}, get ${product.get_quantity}`;
            } else {
                if (product.discount_type === 'fixed') {
                    discountLabel = `Buy ${product.buy_quantity}, get $${product.discount} off`;
                } else if (product.discount_type === 'rate') {
                    discountLabel = `Buy ${product.buy_quantity}, get ${product.discount}% off`;
                }
            }
        }

        let perUnitPrice = null;
        if (product.quantity == 1 && product.unit) {
            if (product.unit === 'ct' || product.unit === 'each' ) {
                perUnitPrice = (product.selling_price / product.quantity_varient).toFixed(2)+ 'each'; 
            } else if (product.unit === 'g' ) {
                perUnitPrice = (product.selling_price / product.quantity_varient).toFixed(2) + '/100 g'; 
            } 
            else if (product.unit==='kg') {
                perUnitPrice = (product.selling_price / (product.quantity_varient*10)).toFixed(2) + '/100 g'; 
            }else{
                perUnitPrice = (product.selling_price / product.quantity_varient).toFixed(2)+ ` / ${product.unit}`; 
            }
        }
       
        const responseObject = {
            product_id: product.product_id,
            product_title: product.product_title,
            product_description: product.product_description,
            product_ingredients: product.product_ingredients,
            product_directions: product.product_directions,
            product_images: product.product_images,
            actual_price: product.actual_price,
            selling_price: product.selling_price,
            ...(perUnitPrice !== null && { per_unit_price: perUnitPrice }),
            ...(product.discount_id !== null && { discount_label: discountLabel })
        };

        return sendHttpResponse(
            req,
            res,
            next,
            generateResponse({
                status: "success",
                statusCode: 200,
                data: responseObject,
                msg: "Product details fetched successfully",
            })
        );

    }
    catch(error){
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
}