const express=require('express');
const app=express();
const bodyparser = require("body-parser");
const passport=require('passport')
require("dotenv").config();
const {useGoogleStrategy}=require('./util/passport');
const session=require('express-session')

useGoogleStrategy();
const authRoutes=require('./routes/auth')
const userRoutes=require('./routes/user');
const storeRoutes=require('./routes/store')
const productRoutes=require('./routes/products');


app.use(bodyparser.json());

app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    next();
});

app.use(authRoutes);
app.use('/userprofile',userRoutes);
app.use('/store',storeRoutes);
app.use('/products',productRoutes)

app.listen(process.env.PORT);