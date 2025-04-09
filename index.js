require('dotenv').config()
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const app = express()

// Check if .env is loading properly
console.log("Loaded PORT from .env:", process.env.PORT);
const port = process.env.PORT || 3000

//Middleware 
app.use(cors())
app.use(express.json())



const {
  MongoClient,
  ServerApiVersion,
  ObjectId
} = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.le9rg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect(); 
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!"); 

    const userCollection = client.db('WomenDB').collection('users')
    const productCollection = client.db('WomenDB').collection('productCollection')
    const categoriesCollection = client.db('WomenDB').collection('categoriesCollection')

    //1.JWT related APIS: Create a jwt token 
    app.post('/jwt', (req, res) => {
      const email = req.body //payload => user email
      // console.log(email);
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '5d'
      })
      res.send({
        token
      })
    })

    //02.Middleware: for verify Token 
    const verifyToken = (req, res, next) => {
      //    console.log('inside the verify token', req.headers.authorization); 
      if (!req.headers.authorization) {
        return res.status('401').send({
          message: 'UnAuthorized Access'
        })
      }
      //Split the authorization to get the token 
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({
            message: "UnAuthorized Access"
          })
        }
        req.decoded = decoded
        next()
      })
    }
    //03.Middleware: Verify Admin 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = {
        email: email
      }
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === 'admin'
      if(!isAdmin) {
        return res.status(403).send({
          message: 'Forbidden Access'
        })
      }
      next()
    }

          // +++++++++ USER API STARTS ++++++++++  
          //01: Create User
          app.post('/users', async (req, res) => {
            const user = req.body
            //Insert email if user does not exists 
            //You can do this many ways(a.email unique, b. upsert, c. simple checking)
            const query = {
              email: user.email
            }
            const isExistingUser = await userCollection.findOne(query)
            if (isExistingUser) {
              return res.send({
                message: 'User already Exists',
                insertedId: null
              })
            }
            
            const result = await userCollection.insertOne(user)
            res.send(result)
          })
          //02.user get 
          app.get('/users', verifyToken, verifyAdmin, async(req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
          }) 
          // +++++++++ USER API ends ++++++++++ 
          
          //++++++++++ Products API Starts +++++++++++ 
            // 01.get menu 
            app.get('/products', async(req, res) => {
              const result = await productCollection.find().toArray()
              res.send(result) 
            })
          //++++++++++ Products API ends +++++++++++ 

          // ================== 02.Categories API Starts ===============  
            app.get('/categories', async(req, res) => {
              const result = await categoriesCollection.find().toArray() 
              res.send(result) 
            })
          // ================== Categories API ends ================= 

          // ================== Product Details starts ================ 
          app.get('/product-details/:id', async (req, res) => { 
            const id = req.params.id 
            const query = {_id: new ObjectId(id)} 
            const result = await productCollection.findOne(query)
            res.send(result)  
          })
          // ================== Product Details ends ================ 



  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('woman server is running');
})

app.listen(port, () => {
  console.log(`Woman is listening from: ${port}`);

})