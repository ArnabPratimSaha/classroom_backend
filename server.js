require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT||5000;
const mongoose = require('mongoose');
const cors=require('cors');
const passport =require('./routes/authentication/google-auth');
const session = require('express-session')
const path=require('path')
app.use(cors());
app.use(express.urlencoded({extended:true}));
app.use(express.json({extended:true}));
app.use(express.raw({extended:true}));
app.use(session({secret: 'keyboard cat',cookie: {},resave:'on',saveUninitialized:true}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/files',express.static(path.join('files')))

const connectMongo = async() => {
  try {
    const response =await mongoose.connect(process.env.DATABASE, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log(`Successfully Connected to ${response.connection.client.s.options.dbName}`);
    mongoose.models.Class.watch().on('change',updateMemberCout);
    
  } catch (error) {
    console.log('could not connect to mongoDB ATLAS');
  }
}
connectMongo();

const auth = require('./routes/authentication/authentication');
const classroom = require('./routes/classroom/classroom');
const user = require('./routes/user/user');
const { updateMemberCout } = require('./mongoose-event/classroom');
const test=require('./routes/test/test');

app.use('/auth', auth);
app.use('/class', classroom);
app.use('/user', user);
app.use('/test',test)
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})