const express=require('express');
const app=express();
const bodyparser = require("body-parser");
const passport=require('passport')
require("dotenv").config();
const {useGoogleStrategy}=require('./util/passport');

useGoogleStrategy();
const authRoutes=require('./routes/auth')
const userRoutes=require('./routes/user');
const storeRoutes=require('./routes/store')


app.use(bodyparser.json());

app.use(passport.initialize());

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    next();
});

app.use(authRoutes);
app.use('/userprofile',userRoutes);
app.use('/store',storeRoutes);


app.listen(process.env.PORT);