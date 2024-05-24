require("dotenv").config();
const jwt = require('jsonwebtoken');


const generateAccessToken= (userId, expiresIn='2h')=> {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn });
}

const generateRefreshToken= (userId, expiresIn='30d')=> {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn });
}

const verifyRefreshToken=(refreshToken)=>{
    try{
        const decodedRefresh=jwt.verify(refreshToken,process.env.JWT_SECRET);
        return decodedRefresh.userId;
    }
    catch(error){
        if (error.name === 'TokenExpiredError') {
            return 'expired';
        }
        return null;
    }
}


module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
};
