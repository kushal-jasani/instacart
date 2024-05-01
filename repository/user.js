const db = require("../util/database");

const findPasswordOfUser = async (userId) => {
  return await db.query("SELECT password FROM users WHERE id=?", [userId]);
};

const updateUser = async (updatedField, userId) => {
  return await db.query("update users set ? where id=?", [
    updatedField,
    userId,
  ]);
};
module.exports = { findPasswordOfUser,updateUser };
