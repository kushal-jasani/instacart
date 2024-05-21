const db = require("../util/database");

const insertOrder = async (orderData) => {
  // const sql = `
  //   INSERT INTO orders SET
  //     user_id = ${orderData.user_id},
  //     store_id = ${orderData.store_id},
  //     delivery_address_id = ${orderData.delivery_address_id},
  //     delivery_instructions = '${orderData.delivery_instructions}',
  //     is_leave_it_door = ${orderData.is_leave_it_door},
  //     actual_subtotal = ${orderData.actual_subtotal},
  //     final_subtotal = ${orderData.final_subtotal},
  //     service_fee = ${orderData.service_fee},
  //     bag_fee = ${orderData.bag_fee},
  //     delivery_fee = ${orderData.delivery_fee},
  //     discount_applied=${orderData.discount_applied},
  //     subtotal = ${orderData.subtotal},
  //     delivery_type = '${orderData.delivery_type}',
  //     delivery_day = '${orderData.delivery_day}',
  //     delivery_slot = '${orderData.delivery_slot}',
  //     country_code = '${orderData.country_code}',
  //     mobile = '${orderData.mobile_number}',
  //     payment_mode = '${orderData.payment_mode}',
  //     gift_recipitent_name = '${orderData.gift_recipitent_name}',
  //     recipitent_country_code = '${orderData.recipitent_country_code}',
  //     recipitent_mobile = '${orderData.recipitent_mobile}',
  //     gift_sender_name = '${orderData.gift_sender_name}',
  //     gift_card_image_id = ${orderData.gift_card_image_id},
  //     gift_message = '${orderData.gift_message}'
  // `;
  const sql =`INSERT INTO orders SET ?`
  return await db.query(sql, orderData);
};

const insertOrderItems = async (orderId, cart_items) => {
  if (cart_items.length === 0) return;

  const productIds = cart_items.map((p) => p.product_id);
  const [priceRows] = await db.query(
  `SELECT product_id, selling_price AS price
  FROM product_quantity
  WHERE product_id IN (?)`,[productIds]
  );

  const productPrices = priceRows.reduce((acc, curr) => {
    acc[curr.product_id] = curr.price;
    return acc;
  }, {});

  const values = cart_items
    .map((item) =>{
      const price=productPrices[item.product_id];
      return `(${orderId}, ${item.product_id}, ${item.quantity}, ${price})`;
    })
    .join(", ");
  const sql = `
    INSERT INTO order_items (order_id, product_id, quantity, price)
    VALUES ${values}
  `;
  return await db.query(sql);
};

const insertPaymentDetails = async (orderId, payment_mode) => {
  const sql = `INSERT INTO payment_details set ?;`;
  return await db.query(sql, {
    order_id: orderId,
    invoice: "invoice",
    status: "pending",
    type: payment_mode,
  });
};

const insertAddress = async (
  userId,
  street,
  zip_code,
  floor,
  business_name,
  latitude,
  longitude
) => {
  const sql = `INSERT INTO address set ?;`;
  return await db.query(sql, {
    user_id: userId,
    street,
    zip_code,
    floor,
    business_name,
    latitude,
    longitude,
  });
};

const findAddressDetails = async (userId) => {
  return await db.query(
    "SELECT id AS address_id,street,floor,business_name,zip_code,latitude,longitude from address where user_id=?",
    [userId]
  );
};

const findAddressFromId = async (id) => {
  return await db.query(
    "SELECT street,floor,business_name,zip_code,latitude,longitude from address where id=?;",
    [id]
  );
};

const insertIntoDeliveryAddress = async (addressDetails) => {
  const { street, floor, business_name, zip_code, latitude, longitude } =
    addressDetails;
  return await db.query(`INSERT INTO delivery_address SET ? `, {
    street,
    floor,
    business_name,
    zip_code,
    latitude,
    longitude,
  });
};

const cartItemsDetailWithDiscount = async (productIds, store_id) => {
  return await db.query(
    `
  SELECT
      p.id AS product_id,
      pq.selling_price AS price,
      p.discount_id,
      d.buy_quantity,
      d.get_quantity,
      d.discount_type,
      d.discount,
      sp.has_service_fee,
      sf.per_item_charge,
      sf.min_value,
      sf.max_percentage
    FROM products p
    LEFT JOIN discounts d ON p.discount_id = d.id
    LEFT JOIN product_quantity pq ON pq.product_id=p.id
    LEFT JOIN store_pricing sp ON p.store_id = sp.store_id
    LEFT JOIN service_fee sf ON p.store_id = sf.store_id
    WHERE p.id IN (?) AND p.store_id = ?
  `,
    [productIds, store_id]
  );
};

const findStorePricing = async (store_id) => {
  return await db.query(
    `
  SELECT *
  FROM store_pricing sp
  LEFT JOIN service_fee sf ON sf.store_id = sp.store_id
  WHERE sp.store_id=?;
  `,
    [store_id]
  );
};

const findPickupAddressDetails=async(store_id)=>{
  return await db.query(`SELECT id,address,city,state,country,zip_code,latitude,longitude FROM store_address WHERE store_id=?`,[store_id])
}

const findGiftCardImages=async()=>{
  return await db.query(`SELECT id,image FROM images
  WHERE is_gift=1;`)
}

const getPaymentDetails=async(order_id)=>{
  return await db.query(`SELECT * FROM payment_details WHERE order_id=?;`,[order_id])
}

const updateOrderStatus=async(order_id,status)=>{
  return await db.query(`UPDATE orders SET status = ? WHERE id = ?;`,[status,order_id])
}

const updatePaymentDetails=async(order_id,invoicenumber,type,status)=>{
  return await db.query(`UPDATE paymentDetails SET invoice_number = ?, type = ?, status = ? WHERE order_id = ?;`,[invoicenumber,type,status,order_id])
}


module.exports = {
  insertOrder,
  insertOrderItems,
  insertPaymentDetails,
  insertAddress,
  findAddressDetails,
  findAddressFromId,
  insertIntoDeliveryAddress,
  cartItemsDetailWithDiscount,
  findPickupAddressDetails,
  findStorePricing,
  findGiftCardImages,
  getPaymentDetails,
  updateOrderStatus,
  updatePaymentDetails
};
