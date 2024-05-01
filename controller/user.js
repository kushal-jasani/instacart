const bcrypt=require('bcryptjs')

const { generateResponse, sendHttpResponse } = require("../helper/response");
const { findUser } = require("../repository/auth");
const { findPasswordOfUser, updateUser } = require("../repository/user");


exports.changeEmail=async(req,res,next)=>{
    try{
        const {updatedEmail,confirmEmail,password}=req.body;
        const userId=req.user.userId;

        let updatedField={};

        if(updatedEmail!==confirmEmail){
            return sendHttpResponse(req,res,next,generateResponse({
               status:'error',
               statusCode:400,
               msg:'updated email and email confirmation has to match👀' 
            }))
        }

        const [user]=await findUser({email:confirmEmail});
        if(user.length && user[0].id!==userId){
            return sendHttpResponse(
                req,
                res,
                next,
                generateResponse({
                  statusCode: 400,
                  status: "error",
                  msg: `Can't update..User with this ${confirmEmail} email is already registered👀`,
                })
              );
        }

        const [dbPassword] = await findPasswordOfUser(userId);
        const hashedDbPassword=dbPassword[0].password;
        const passwordMatch = await bcrypt.compare(
            password,
            hashedDbPassword
          );
        if(passwordMatch){
            updatedField['email']=confirmEmail;
            const [updateResult]=await updateUser(updatedField,userId);

            if(updateResult.affectedRows==0){
                return sendHttpResponse(
                    req,
                    res,
                    next,
                    generateResponse({
                      status: "error",
                      statusCode: 404,
                      msg: "no user found or no changes have be made",
                    })
                  );
            }
            return sendHttpResponse(
                req,
                res,
                next,
                generateResponse({
                  statusCode: 200,
                  status: "success",
                  msg: "Your Email address is updated successfully🚀",
                })
              );
        }
        else{
            return sendHttpResponse(
                req,
                res,
                next,
                generateResponse({
                  status: "error",
                  statusCode: 400,
                  msg: "entered password is incorrect🚨",
                })
              );
        }
    }
    catch(error){
        console.log("error while updateing email: ", error);
        return sendHttpResponse(
          req,
          res,
          next,
          generateResponse({
            status: "error",
            statusCode: 500,
            msg: "Internal server error when updating email👨🏻‍🔧",
          })
        );
    }
}