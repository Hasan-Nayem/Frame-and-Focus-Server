const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 3000;

const uri = `mongodb+srv://nayemmh66:uSVYH3knYa0ZFmHG@cluster0.n6ux36g.mongodb.net/?retryWrites=true&w=majority`;

//middleware
app.use(cors());
app.use(express.json());
require('dotenv').config();
//verify jwt token
const verifyJWT = (req,res,next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    res.status(404).send({error:true,"message":"Unauthorized Access"});
  }
  const token = authorization;
  // console.log("Token received in jwt verify - ",token);
  jwt.verify(token, process.env.ACCESS_TOKEN, (error,decoded)=>{
    if(error){
      res.status(403).send({error:true,"message":"Forbidden Access"});
    }
    req.decoded = decoded;
    console.log(decoded);
    next();
  })
}


app.get('/', (req, res) => {
    res.send("Summer Camp Is Running");
});

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  

  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");

      const userCollection = client.db("phero-assignment-12").collection("users");
      const classCollection = client.db("phero-assignment-12").collection("classes");
      const bookedClassesCollection = client.db("phero-assignment-12").collection("bookedClasses");
      


      app.post('/jwt',  (req, res) => {
        const user = req.body;
        // console.log(user);
        const token =  jwt.sign(user,process.env.ACCESS_TOKEN,{expiresIn : '1h'});
        // console.log(token);
        res.send({token});
      })

      //verify the email is admin or not
      const verifyAdmin = async (req, res, next) => {
        const decodedEmail = req.decoded.email;
        // console.log("email in admin verify" , email);
        const query = {email:decodedEmail};
        const user = await userCollection.findOne(query);
        if(user.role != 0){
          return res.status(403).send({ error: true, message: 'Forbidden Access' });
        }
        // console.log("Admin verified ",decodedEmail);
        next();
      }

      //verify the email is instructor or not
      const verifyInstructor = async (req, res, next) => {
        const decodedEmail = req.decoded.email;
        console.log("email in instructor verify" , decodedEmail);
        const query = {email:decodedEmail};
        const user = await userCollection.findOne(query);
        if(user.role != 2){
          return res.status(403).send({ error: true, message: 'Forbidden Access' });
        }
        console.log("Instructor verified ",decodedEmail);
        next();
      }

      //Insert a new user if its not exist
      app.post('/user', async (req, res) => {
        const user = req.body;
        // console.log(user);
        const query = {email : user.email}
        const findUser = await userCollection.findOne(query);
        if(findUser){
            return;
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
      })

      app.get('/user', verifyJWT, verifyAdmin, async (req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
      });

      //get a specefic user data
      app.get('/user/:email', async (req, res) => {
        const email = req.params.email;
        const query = {email : email}
        const findUser = await userCollection.findOne(query);
        res.send(findUser);
      });

      //update user role
      app.put('/role/:email', verifyJWT, verifyAdmin, async (req, res) => {
        const userEmail = req.params.email;
        const role = req.body.role;
        const filter = {email : userEmail};
        const options = { upsert: false };
        const update = { 
          $set : { 
            role : role, 
          }
        };
        const result = await userCollection.updateOne(filter, update, options);

      });


      //Instructors Api
      //Add a class
      app.post('/class', verifyJWT, verifyInstructor, async (req, res) =>{
        const classData = req.body;
        const result = await classCollection.insertOne(classData);
        res.send(result);
      });
      //get specefied instructors class
      app.get('/class/:email', verifyJWT, verifyInstructor, async (req, res) =>{
        const email = req.params.email;
        const query = {email: email};
        const result = await classCollection.find(query).toArray();
        res.send(result);
      })

      // get all class for admin and instructor
      app.get('/class', async (req, res) => {
        const queryData = req.query.status;
        console.log(queryData);
        if(queryData || queryData === 'approved'){
          const query = { status: 'approved' };
          const result = await classCollection.find(query).toArray();
          res.send(result);
        }else{
          const result = await classCollection.find().sort({ totalStudent: -1 }).toArray();
          res.send(result);
        }
      })

      //feedback if denied only for admin 
      app.put('/class/:id', verifyJWT, verifyAdmin, async (req, res) => {
        const id = req.params.id;
        const data = req.body;
        const queryData = req.query.status;
        console.log(id,data);
        const options = { upsert: true };
        const filter = { _id: new ObjectId(id) };
        let updateData;
        if(data.feedback){
           updateData = { 
            $set : { 
              feedback : data.feedback, 
              status: "denied",
            }
          }
        }else if(queryData){
           updateData = { 
            $set : { 
              status: "approved",
            }
          }
        }
        const result = await classCollection.updateOne(filter, updateData, options);
        res.send(result);

      })

      //API for student to add class in their dashboard
      app.post('/selectClass', verifyJWT, async (req, res) => {
        const data = req.body;
        console.log(data);
        const updateSeat = parseInt(data.availableSeat) - 1;
        const result = await bookedClassesCollection.insertOne(data);

        const filter = { _id : new ObjectId(data.courseId) };
        const options = { upsert: true };
        const updateData = {
          $set: { 
            seat: updateSeat
          },
          $inc : {
            totalStudent : 1
          }
        }
        const updateAvailableSeat = await classCollection.updateOne(filter, updateData, options);
        
        console.log({result, updateAvailableSeat})

        res.send({result, updateAvailableSeat});

      });


    } finally {
      // Ensures that the client will close when you finish/error
    //   await client.close();
    }
  }
  run().catch(console.dir);

app.listen(port, () => {
    console.log("Listening on port " + port);
});