const db = require("../util/database");

const insertOrder = async (orderData) => {
  const sql = `
    INSERT INTO orders SET
      user_id = ${orderData.user_id},
      store_id = ${orderData.store_id},
      delivery_address_id = ${orderData.delivery_address_id},
      delivery_instructions = '${orderData.delivery_instructions}',
      is_leave_it_door = ${orderData.is_leave_it_door},
      actual_subtotal = ${orderData.actual_subtotal},
      final_subtotal = ${orderData.final_subtotal},
      service_fee = ${orderData.service_fee},
      bag_fee = ${orderData.bag_fee},
      delivery_fee = ${orderData.delivery_fee},
      subtotal = ${orderData.subtotal},
      delivery_type = '${orderData.delivery_type}',
      delivery_day = '${orderData.delivery_day}',
      delivery_slot = '${orderData.delivery_slot}',
      country_code = '${orderData.country_code}',
      mobile = '${orderData.mobile_number}',
      payment_mode = '${orderData.payment_mode}',
      gift_recipitent_name = '${orderData.gift_recipitent_name}',
      recipitent_country_code = '${orderData.recipitent_country_code}',
      recipitent_mobile = '${orderData.recipitent_mobile}',
      gift_sender_name = '${orderData.gift_sender_name}',
      gift_card_image_id = ${orderData.gift_card_image_id},
      gift_message = '${orderData.gift_message}'
  `;
  return await db.query(sql, orderData);
};

const insertOrderItems = async (orderId, cart_items) => {
  if (cart_items.length === 0) return;

  const values = cart_items
    .map(
      (item) =>
        `(${orderId}, ${item.product_id}, ${item.quantity}, ${item.price})`
    )
    .join(", ");
    const sql = `
    INSERT INTO order_items (order_id, product_id, quantity, price)
    VALUES ${values}
  `;
  return await db.query(sql);
};

const insertPaymentDetails=async(orderId,payment_mode)=>{
    const sql=`INSERT INTO payment_details set ?;`
    return await db.query(sql,{order_id:orderId,invoice:"invoice",status:'pending',type:payment_mode})
}

const insertAddress=async(userId,street, zip_code ,floor, business_name, latitude, longitude)=>{
    const sql=`INSERT INTO delivery_address set ?;`
    return await db.query(sql,{user_id:userId,street, zip_code ,floor, business_name, latitude, longitude})
}

const findAddressDetails = async (userId) => {
    return await db.query(
      "SELECT id AS address_id,street,floor,business_name,zip_code,latitude,longitude from delivery_address where user_id=?",
      [userId]
    );
  };



module.exports = { insertOrder,insertOrderItems,insertPaymentDetails,insertAddress,findAddressDetails};
