const crypto = require("crypto");
const db=require('../util/database');

const findUser=async(key)=>{
    const keys = Object.keys(key);
    const values = Object.values(key);

    let sql = `SELECT * FROM users WHERE `
    sql += keys.map(key => `${key} = ?`).join(' AND ');

    return await db.query(sql, values);
}

const insertUser=async(email,
    country_code,
    phoneno,
    is_verify,
    hashedPassword)=>{
    if(email){
        const firstName = email.substring(0, email.indexOf('@'));
        return await db.query('INSERT INTO users SET ?',{first_name:firstName,email:email,password:hashedPassword})
    }
    else{
        return await db.query('INSERT INTO users SET ?',{country_code:country_code,phoneno:phoneno,is_verify:is_verify,password:hashedPassword})
    }
}

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

const findReferralByCode=async(code)=>{
  const sql=`SELECT * FROM referrals WHERE code=?`;
  return db.query(sql,[code]);
};

const updateUserReferral=async(userId,referralCode)=>{
  const sql=`UPDATE users SET referral_registered_with=? WHERE id=?`;
  return db.query(sql,[referralCode,userId]);
};

const insertReferral=async(userId,code)=>{
  const sql=`INSERT INTO referrals (user_id,code,earned_amt) VALUES (?,?,0)`;
  return db.query(sql,[userId,code])
}


const generateReferralCode = (userId, email, phoneno) => {
  const baseString = `${email || ''}${phoneno || ''}${userId}`;
  return crypto.createHash('sha256').update(baseString).digest('hex').substr(0, 8);
};


module.exports = {
  findUser,
  insertUser,
  addTokenToUser,
  updatePasswordAndToken,
  generateToken,
  findReferralByCode,
  updateUserReferral,
  insertReferral,
  generateReferralCode
};