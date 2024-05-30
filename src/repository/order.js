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
  const sql = `INSERT INTO orders SET ?`;
  return await db.query(sql, orderData);
};

const insertOrderItems = async (orderId, cart_items) => {
  if (cart_items.length === 0) return;

  const productIds = cart_items.map((p) => p.product_id);
  const [priceRows] = await db.query(
    `SELECT product_id, selling_price AS price
  FROM product_quantity
  WHERE product_id IN (?)`,
    [productIds]
  );

  const productPrices = priceRows.reduce((acc, curr) => {
    acc[curr.product_id] = curr.price;
    return acc;
  }, {});

  const values = cart_items
    .map((item) => {
      const price = productPrices[item.product_id];
      return `(${orderId}, ${item.product_id}, ${item.quantity}, ${price})`;
    })
    .join(", ");
  const sql = `
    INSERT INTO order_items (order_id, product_id, quantity, price)
    VALUES ${values}
  `;
  return await db.query(sql);
};

const insertPaymentDetails = async (orderId,payment_mode) => {
  const sql = `INSERT INTO payment_details set ?;`;
  return await db.query(sql, {
    order_id: orderId,
    invoice: "invoice",
    status: "pending",
    type: payment_mode,
  });
};

const findOrdersOfUser = async (user_id) => {
  const sql = `
      SELECT 
        o.id AS order_id,
        o.status,
        o.delivery_address_id,
        o.subtotal,
        o.delivery_type,
        o.delivery_day,
        o.delivery_slot,
        o.payment_mode,
        o.pickup_address_id,
        o.pickup_day,
        o.pickup_slot,
        o.pickup_fee,
        o.created_at,
        o.updated_at,
        COUNT(ot.id) AS items_count
      FROM orders o
      LEFT JOIN order_items ot ON o.id = ot.order_id 
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
  return await db.query(sql, [user_id]);
};

const findOrderDetails = async (user_id, order_id) => {
  const sql = `
  SELECT 
    o.id AS order_id,
    o.store_id,
    o.status,
    o.delivery_address_id,
    o.delivery_instructions,
    o.is_leave_it_door,
    o.actual_subtotal,
    o.final_subtotal,
    o.subtotal,
    o.service_fee,
    o.bag_fee,
    o.discount_applied,
    o.delivery_fee,
    o.delivery_type,
    o.delivery_day,
    o.delivery_slot,
    o.country_code,
    o.mobile_number,
    o.payment_mode,
    o.gift_recipitent_name,
    o.recipitent_country_code,
    o.recipitent_mobile,
    o.gift_sender_name,
    o.gift_card_image_id,
    o.gift_message,
    o.pickup_address_id,
    o.pickup_day,
    o.pickup_slot,
    o.pickup_fee,
    o.created_at,
    o.updated_at,
    da.street AS delivery_street,
    da.floor AS delivery_floor,
    da.business_name AS delivery_business_name,
    da.zip_code AS delivery_zip_code,
    da.latitude AS delivery_latitude,
    da.longitude AS delivery_longitude,
    sa.address AS store_address,
    sa.city AS store_city,
    sa.state AS store_state,
    sa.country AS store_country,
    sa.zip_code AS store_zip_code,
    sa.latitude AS store_latitude,
    sa.longitude AS store_longitude,
    pd.invoice AS payment_invoice,
    pd.status AS payment_status,
    pd.type AS payment_type,
    s.name AS store_name,
    s.logo AS store_logo
  FROM orders o
  LEFT JOIN delivery_address da ON o.delivery_address_id = da.id
  LEFT JOIN store_address sa ON o.store_id = sa.store_id
  LEFT JOIN payment_details pd ON o.id = pd.order_id
  LEFT JOIN store s ON s.id=o.store_id
  WHERE o.user_id = ? AND o.id=?
`;
  return await db.query(sql, [user_id,order_id]);
};

const findOrderItems = async (orderIds) => {
  const sql = `
  SELECT 
    oi.order_id,
    oi.product_id,
    oi.quantity,
    oi.price,
    p.title AS product_title,
    (SELECT i.image FROM images i WHERE oi.product_id = i.id)AS product_image
  FROM order_items oi
  LEFT JOIN products p ON oi.product_id = p.id
  LEFT JOIN images i ON oi.product_id = i.id
  WHERE oi.order_id IN (?)
`;
  return await db.query(sql, [orderIds]);
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

const findAddressFromId = async (id, user_id) => {
  return await db.query(
    "SELECT street,floor,business_name,zip_code,latitude,longitude FROM address WHERE id=? AND user_id=?;",
    [id, user_id]
  );
};
const deleteAddressFromId = async (id, user_id) => {
  return await db.query(`DELETE FROM address WHERE id=? AND user_id=?`, [
    id,
    user_id,
  ]);
};

const updateAddress = async (id, user_id, updatedfields) => {
  return await db.query("UPDATE address SET ? WHERE id=? AND user_id=?", [
    updatedfields,
    id,
    user_id,
  ]);
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
      p.category_id,
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

const findPickupAddressDetails = async (store_id) => {
  return await db.query(
    `SELECT id,address,city,state,country,zip_code,latitude,longitude FROM store_address WHERE store_id=?`,
    [store_id]
  );
};

const findGiftCardImages = async () => {
  return await db.query(`SELECT id,image FROM images
  WHERE is_gift=1;`);
};

const getPaymentDetails = async (order_id) => {
  return await db.query(`SELECT *,o.user_id FROM payment_details
  JOIN orders o ON o.id=payment_details.order_id
  WHERE order_id=?;`, [
    order_id,
  ]);
};

const updateOrderStatus = async (order_id, status) => {
  return await db.query(`UPDATE orders SET status = ? WHERE id = ?;`, [
    status,
    order_id,
  ]);
};

const updatePaymentDetails = async (order_id, invoicenumber, type, status) => {
  return await db.query(
    `UPDATE payment_details SET invoice_number = ?, type = ?, status = ? WHERE order_id = ?;`,
    [invoicenumber, type, status, order_id]
  );
};

const findStoreDiscount=async(store_id)=>{
  return await db.query(`SELECT sd.id,sd.store_id,sd.category_id,sd.discount_type,sd.discount_amt,sd.min_required_order 
  FROM store_discount sd 
  WHERE sd.store_id=?`,[store_id])
}

const countOrdersByUserId =async (userId) => {
  const sql = 'SELECT COUNT(*) as count FROM orders WHERE user_id = ?';
  return await db.query(sql, [userId]);
};

const findUserById = async(userId) => {
  const sql = 'SELECT id,referral_registered_with,first_name FROM users WHERE id = ?';
  return await db.query(sql, [userId]);
};

const findReferralByCode = async(code) => {
  const sql = 'SELECT * FROM referrals WHERE code = ?';
  return await db.query(sql, [code]);
};

const updateReferralBonus = async(userId, amount) => {
  const sql = 'UPDATE referrals SET earned_amt = earned_amt + ? WHERE user_id = ?';
  return await db.query(sql, [amount, userId]);
};

const getReferralAmount = async(userId) => {
  const query = 'SELECT earned_amt FROM referrals WHERE user_id = ?';
  return await db.query(query, [userId]);
};

const deductReferralAmount = async(userId, usedAmt) => {
  const sql = 'UPDATE referrals SET earned_amt = earned_amt - ? WHERE user_id = ?';
  return await db.query(sql, [usedAmt, userId]);
};

module.exports = {
  insertOrder,
  insertOrderItems,
  insertPaymentDetails,
  insertAddress,
  findOrdersOfUser,
  findOrderItems,
  findOrderDetails,
  findAddressDetails,
  findAddressFromId,
  updateAddress,
  deleteAddressFromId,
  insertIntoDeliveryAddress,
  cartItemsDetailWithDiscount,
  findPickupAddressDetails,
  findStorePricing,
  findGiftCardImages,
  getPaymentDetails,
  updateOrderStatus,
  updatePaymentDetails,
  countOrdersByUserId,
  findStoreDiscount,
  findUserById,
  findReferralByCode,
  updateReferralBonus,
  getReferralAmount,
  deductReferralAmount
};
