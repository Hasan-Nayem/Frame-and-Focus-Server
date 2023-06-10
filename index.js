require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 3000;
const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_PASSWORD}@cluster0.n6ux36g.mongodb.net/?retryWrites=true&w=majority`;

//middleware
app.use(express.json());
app.use(cors());

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


      app.post('/jwt',(req, res) => {
        const data = req.body;

        const token = jwt.sign(data,process.env.ACCESS_TOKEN);
        console.log(data);
        res.send({token});
      })

      //All user data
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

      //get a specefic user data
      app.get('/user/:email', async (req, res) => {
        const email = req.params.email;
        const query = {email : email}
        const findUser = await userCollection.findOne(query);
        res.send(findUser);
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