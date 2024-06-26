const db = require("../util/database");


const findProductDetail=async(productId,userId)=>{
  
    let query=`
    SELECT 
                p.id AS product_id,
                p.category_id AS category_id,
                p.subcategory_id AS subcategory_id,
                p.title AS product_title,
                p.description AS product_description,
                p.ingredients AS product_ingredients,
                p.directions AS product_directions,
                JSON_ARRAYAGG(pi.image) AS product_images,
                pq.quantity AS quantity,
                pq.quantity_varient AS quantity_varient,
                pq.unit AS unit,
                pq.actual_price AS actual_price,
                pq.selling_price AS selling_price,
                p.discount_id,
                d.buy_quantity,
                d.get_quantity,
                d.discount_type,
                d.discount,
                CASE
                WHEN EXISTS (
                    SELECT 1 
                    FROM saved_products sp 
                    WHERE sp.product_id = p.id AND sp.user_id = ?
                ) THEN 1
                ELSE 0
                END AS is_saved
            FROM 
                products p
            LEFT JOIN 
                images pi ON p.id = pi.product_id
            LEFT JOIN 
                product_quantity pq ON p.id = pq.product_id
            LEFT JOIN 
                discounts d ON p.discount_id = d.id
            WHERE 
                p.id = ?
            GROUP BY 
                p.id, p.title, p.description, p.ingredients, p.directions, pq.quantity, pq.quantity_varient, pq.unit, pq.actual_price, pq.selling_price, p.discount_id, d.buy_quantity, d.get_quantity, d.discount_type, d.discount,is_saved
    `
    return await db.query(query,[userId,productId]);
}

const insertIntoSaved = async (productId, userId) => {
    return await db.query("insert into saved_products set ?", {
      product_id: productId,
      user_id: userId,
    });
  };

const productExistsInSaved=async(productId,userId)=>{
    return await db.query('select * from saved_products where product_id=? && user_id=?',[productId,userId])
  }

const deleteFromSavedList=async(productId,userId)=>{
    return await db.query('delete from saved_products where product_id=? && user_id=?',[productId,userId])
  }

const generatePerUnitPrice=(product)=>{
    let perUnitPrice = null;
        if (product.quantity == 1 && product.unit) {
            if (product.unit === 'ct' || product.unit === 'each' ) {
                perUnitPrice = (product.selling_price / product.quantity_varient).toFixed(2)+ ' each'; 
            } else if (product.unit === 'g' ) {
                perUnitPrice = (product.selling_price / product.quantity_varient).toFixed(2) + '/ 100 g'; 
            } 
            else if (product.unit==='kg') {
                perUnitPrice = (product.selling_price / (product.quantity_varient*10)).toFixed(2) + '/ 100 g'; 
            }else{
                perUnitPrice = (product.selling_price / product.quantity_varient).toFixed(2)+ ` / ${product.unit}`; 
            }
        }
        return perUnitPrice
}
module.exports={findProductDetail,insertIntoSaved,productExistsInSaved,deleteFromSavedList,generatePerUnitPrice}