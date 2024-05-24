const crypto = require("crypto");
const db = require("../util/database");

const findUser = async (key) => {
  const keys = Object.keys(key);
  const values = Object.values(key);

  let sql = `SELECT * FROM users WHERE `;
  sql += keys.map((key) => `${key} = ?`).join(" AND ");

  return await db.query(sql, values);
};

const insertUser = async (
  email,
  country_code,
  phoneno,
  firstName,
  lastName,
  is_verify,
  hashedPassword,
  from_google
) => {
  return await db.query("INSERT INTO users SET ?", {
    email,
    country_code,
    phoneno,
    first_name: firstName,
    last_name: lastName,
    password: hashedPassword,
    is_verify,
    from_google,
  });
};

const addTokenToUser = async (resettoken, resettokenexpiry, email) => {
  return await db.query(
    "update users set resettoken=?,resettokenexpiry=? where email=?",
    [resettoken, resettokenexpiry, email]
  );
};

const updatePasswordAndToken = async (hashedNewPassword, userId) => {
  return await db.query(
    "update users set password=?,resettoken=NULL where id=?",
    [hashedNewPassword, userId]
  );
};

const generateToken = (length, expiryhours) => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(length, async (err, buf) => {
      if (err) {
        reject(err);
      } else {
        const resettoken = buf.toString("hex");
        const resettokenexpiry = new Date(
          Date.now() + expiryhours * 3600 * 1000
        );
        resolve({ resettoken, resettokenexpiry });
      }
    });
  });
};

module.exports = {
  findUser,
  insertUser,
  addTokenToUser,
  updatePasswordAndToken,
  generateToken,
};
