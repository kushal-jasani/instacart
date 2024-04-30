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
    hashedPassword)=>{
    if(email){
        const firstName = email.substring(0, email.indexOf('@'));
        return await db.query('INSERT INTO users SET ?',{first_name:firstName,email:email,password:hashedPassword})
    }
    else{
        return await db.query('INSERT INTO users SET ?',{country_code:country_code,phoneno:phoneno,password:hashedPassword})
    }
}

module.exports={findUser,insertUser}