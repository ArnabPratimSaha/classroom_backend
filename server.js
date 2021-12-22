require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT||5000;
const mongoose = require('mongoose');
const cors=require('cors');
const passport =require('./google-auth');
const session = require('express-session')

app.use(cors());
app.use(express.json());
app.use(session({secret: 'keyboard cat',cookie: {},resave:'on',saveUninitialized:true}));
app.use(passport.initialize());
app.use(passport.session());

const connectMongo = async() => {
  try {
    const response =await mongoose.connect(process.env.DATABASE, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log(`Successfully Connected to ${response.connection.client.s.options.dbName}`)
  } catch (error) {
    console.log('could not connect to mongoDB ATLAS');
  }
}
connectMongo();

const auth=require('./routes/authentication/authentication');

app.use('/auth',auth);


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})