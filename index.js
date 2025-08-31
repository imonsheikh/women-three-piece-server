require('dotenv').config()
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const app = express()

// Check if .env is loading properly
// console.log("Loaded PORT from .env:", process.env.PORT);
const port = process.env.PORT || 5000

//Middleware 
app.use(cors({
  origin: [
            'http://localhost:5173',
            'http://localhost:5174',
           'https://woman-three-piece.web.app',
           'https://e-commerce-website0001.netlify.app'
          ],
  // credentials: true
}))
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
    const subCategoriesCollection = client.db('WomenDB').collection('subCategoriesCollection')
    const cartsCollection = client.db('WomenDB').collection('cartsCollection')
    const ordersCollection = client.db('WomenDB').collection('ordersCollection')

    //1.JWT related APIS: Create a jwt token 
    app.post('/jwt', (req, res) => {
      const {email} = req.body //payload => user email
      // console.log(email);
      const token = jwt.sign({email}, process.env.ACCESS_TOKEN_SECRET, {
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
            message: "UnAuthorized Access2"
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
      if (!isAdmin) {
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
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded.email) {
        return res.status(403).send({
          message: "Forbidden Access"
        })
      }
      try {
        const query = {
          email: email
        }
        const user = await userCollection.findOne(query)
        let admin = false
        if (user) {
          admin = user.role === 'admin'
        }
        res.send({
          admin
        })
      } catch (error) {
        console.error("Error Fetching admin status: ", error)
        res.status(500).send({
          message: 'Failed to fetch admin status'
        })
      }
    })
    // +++++++++ USER API ends ++++++++++ 

    //++++++++++ Products API Starts +++++++++++ 
    // 01.get menu 
    app.get('/products', async (req, res) => {
      const result = await productCollection.find().toArray()
      res.send(result)
    })
    app.post('/products', async (req, res) => {
      const product = req.body
      const result = await productCollection.insertOne(product)
      res.send(result)
    })
    app.delete('/product/:id', async (req, res) => {
      const id = req.params.id
      // console.log(id); 
      const query = {
        _id: new ObjectId(id)
      }
      const result = await productCollection.deleteOne(query)
      res.send(result)
    })
    //++++++++++ Products API ends +++++++++++ 

    // ================== 02.Categories API Starts ===============  
    app.get('/categories', async (req, res) => {
      const result = await categoriesCollection.find().toArray()
      res.send(result)
    })
    app.post('/categories', verifyToken, verifyAdmin, async (req, res) => {
      const category = req.body
      const result = await categoriesCollection.insertOne(category)
      res.send(result)
    })
    app.put('/categories/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const {
        name,
        image
      } = req.body
      const filter = {
        _id: new ObjectId(id)
      }
      const updateDoc = {
        $set: {
          name,
          image
        }
      }
      const result = await categoriesCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    app.delete('/categories/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = {
        _id: new ObjectId(id)
      }
      const result = await categoriesCollection.deleteOne(query)
      res.send(result)
    })
    // ================== Categories API ends ================= 


    // ================== Sub Categories API starts =================  
    
// get all subcategories
app.get('/subcategories', async (req, res) => {
  const result = await subCategoriesCollection.find().toArray()
  res.send(result)
})

// add new subcategory (only admin)
app.post('/subcategories', verifyToken, verifyAdmin, async (req, res) => {
  const { name, categoryId } = req.body
  if (!name || !categoryId) {
    return res.status(400).send({ error: "name and categoryId required" })
  }

  const newSubCategory = {
    name,
    categoryId,
    createdAt: new Date()
  }

  const result = await subCategoriesCollection.insertOne(newSubCategory)
 res.send({ _id: result.insertedId, ...newSubCategory });
})

// update subcategory (only admin)
app.put('/subcategories/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id
  const { name, categoryId } = req.body
  const filter = { _id: new ObjectId(id) }
  const updateDoc = {
    $set: {
      name,
      categoryId,
      updatedAt: new Date()
    }
  }
  const result = await subCategoriesCollection.updateOne(filter, updateDoc)
  res.send(result)
})

// delete subcategory (only admin)
app.delete('/subcategories/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id) }
  const result = await subCategoriesCollection.deleteOne(query)
  res.send(result)
})
    // ================== Sub Categories API ends ================= 

    // ================== Product Details starts ================ 
    app.get('/product-details/:id', async (req, res) => {
      const id = req.params.id
      const query = {
        _id: new ObjectId(id)
      }
      const result = await productCollection.findOne(query)
      res.send(result)
    })
    // ================== Product Details ends ================   

    // ================== Carts starts ============= 
    app.get('/carts', async (req, res) => {
      const email = req.query.email
      const emailQuery = {
        userEmail: email
      }
      const result = await cartsCollection.find(emailQuery).toArray()
      res.send(result)
    })
    app.post('/cart', async (req, res) => {
      const product = req.body
      const {
        productName,
        userEmail
      } = product
      //Existing Check
      const existingProduct = await cartsCollection.findOne({
        productName,
        userEmail
      })
      if (existingProduct) {
        return res.status(400).send({
          message: "product already in cart"
        })
      }

      const result = await cartsCollection.insertOne(product)
      res.send(result)
    })  

  app.patch('/cart/:id/:action', async (req, res) => {
  const { id, action } = req.params;

  const change = action === "increase" ? 1 : -1;

  // Step 1: Only allow if quantity will remain >= 1
  const cartItem = await cartsCollection.findOne({ _id: new ObjectId(id) });
  if (!cartItem) return res.status(404).send({ error: "Item not found" });

  const newQty = cartItem.quantity + change;
  if (newQty < 1) return res.status(400).send({ error: "Quantity cannot be less than 1" });

  // Step 2: Perform atomic update using $inc and $set
  const result = await cartsCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $inc: { quantity: change },
      $set: {
        totalPrice: (cartItem.productPrice * newQty),
      },
    }
  );

  res.send(result);
});

    //Delete multiple 
    app.delete('/cart', verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res.status(400).send({
            error: "Email is required"
          });
        }

        const result = await cartsCollection.deleteMany({
          userEmail: email
        });

        res.send({
          message: "Cart cleared successfully",
          deletedCount: result.deletedCount,
        });
      } catch (error) {
        console.error("Error clearing cart:", error);
        res.status(500).send({
          error: "Failed to clear cart"
        });
      }
    });
    //Delete Single 
    app.delete("/cart/:id", verifyToken, async (req, res) => {
      const id = req.params.id;

      try {
        const result = await cartsCollection.deleteOne({
          _id: new ObjectId(id)
        });

        if (result.deletedCount === 1) {
          res.send({
            success: true,
            message: "Item removed from cart."
          });
        } else {
          res.status(404).send({
            success: false,
            message: "Item not found."
          });
        }
      } catch (error) {
        console.error("Error deleting cart item:", error);
        res.status(500).send({
          success: false,
          message: "Internal server error."
        });
      }
    });

    // ================== Carts ends =============

    // ================== Order Starts =========== 
  app.post("/order", async (req, res) => {
  const order = req.body;

  try {
    // 1. Generate unique invoice number
    const invoiceNo =  `INV-${Math.floor(10000000 + Math.random() * 90000000)}`;
    order.invoiceNo = invoiceNo;
    order.date = new Date(); // Order date

    // 2. Order insert
    const result = await ordersCollection.insertOne(order);

    if (result.insertedId) {
      // 3. Cart delete
      await cartsCollection.deleteMany({ userEmail: order.userEmail });

      // 4. Stock Update
      for (const item of order.items) {
        await productCollection.updateOne(
          { _id: new ObjectId(item.productId) },
          { $inc: { stock: -item.quantity } }
        );
      }

      return res.send({
        success: true,
        insertedId: result.insertedId,
        invoiceNo: invoiceNo, // <-- send to frontend
        message: "Order placed successfully",
      });
    } else {
      return res.status(400).send({
        success: false,
        message: "Failed to place order",
      });
    }
  } catch (err) {
    console.error("Error placing order:", err);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
});

    app.get("/orders", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.status(400).json({
          error: "Email query parameter is required"
        });
      }

      try {
        const orders = await ordersCollection
          .find({
            userEmail: email
          })
          .sort({
            date: -1
          }) // নতুন অর্ডার আগে দেখাবে
          .toArray();

        res.json(orders);
      } catch (err) {
        console.error("Error fetching orders:", err);
        res.status(500).json({
          error: "Internal server error"
        });
      }
    });
    //3
    app.patch("/orders/:id", async (req, res) => {
      const {
        status
      } = req.body;
      const result = await ordersCollection.updateOne({
        _id: new ObjectId(req.params.id)
      }, {
        $set: {
          status
        }
      });
      res.send(result);
    });
    //4
    app.get("/all-orders", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const orders = await ordersCollection.find().toArray();
        res.status(200).send(orders);
      } catch (error) {
        console.error("Error fetching all orders:", error);
        res.status(500).send({
          error: "Failed to fetch all orders"
        });
      }
    });
    // ================== Order Ends =============

    // ================== Admin Home starts ============= 
    // Total users
    app.get('/users/count', async (req, res) => {
      const count = await userCollection.estimatedDocumentCount();
      res.send({
        count
      });
    });

    // Total products
    app.get('/products/count', async (req, res) => {
      const count = await productCollection.estimatedDocumentCount();
      res.send({
        count
      });
    });

    // Total orders
    app.get('/orders/count', async (req, res) => {
      const count = await ordersCollection.estimatedDocumentCount();
      res.send({
        count
      });
    }); 
   // GET /stats/revenue
app.get("/stats/revenue", async (req, res) => {
  try {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayRevenue, monthRevenue, totalRevenue] = await Promise.all([
      ordersCollection.aggregate([
        { $match: { date: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]).toArray(),

      ordersCollection.aggregate([
        { $match: { date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]).toArray(),

      ordersCollection.aggregate([
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]).toArray(),
    ]);

    res.json({
      today: todayRevenue[0]?.total || 0,
      month: monthRevenue[0]?.total || 0,
      lifetime: totalRevenue[0]?.total || 0,
    });
  } catch (err) {
    console.error("Error in /stats/revenue", err);
    res.status(500).json({ error: "Failed to fetch revenue stats" });
  }
}); 

// GET /orders/recent?limit=5
app.get("/orders/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

     const orders = await ordersCollection.find({}, { projection: { invoiceNo: 1, customer: 1, total: 1, status: 1, date: 1 } })
      .sort({ date: -1 })
      .limit(limit)
      .toArray();

    res.json(orders);
  } catch (err) {
    console.error("Error in /orders/recent", err);
    res.status(500).json({ error: "Failed to fetch recent orders" });
  }
}); 

// GET /products/low-stock?limit=5
app.get("/products/low-stock", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

     const products = await productCollection.find({ stock: { $lt: 5 } }, { projection: { productName: 1, stock: 1 } })
      .sort({ stock: 1 })
      .limit(limit)
      .toArray();

    res.json(products);
  } catch (err) {
    console.error("Error in /products/low-stock", err);
    res.status(500).json({ error: "Failed to fetch low stock products" });
  }
});



// Sales Trend (last 7 days revenue/orders)
app.get("/stats/trend", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const data = await ordersCollection.aggregate([
      { $match: { date: { $gte: sinceDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    res.json(data.map(d => ({
      date: d._id,
      revenue: d.revenue,
      orders: d.orders
    })));
  } catch (err) {
    console.error("Error in /stats/trend:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Top Selling Products
app.get("/stats/top-products", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const data = await ordersCollection.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$items.productName" },
          salesCount: { $sum: "$items.quantity" }
        }
      },
      { $sort: { salesCount: -1 } },
      { $limit: limit }
    ]).toArray();

    res.json(data);
  } catch (err) {
    console.error("Error in /stats/top-products:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/users/active", async (req, res) => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const activeCount = await userCollection.countDocuments({
      lastActive: { $gte: fiveMinAgo }
    });

    res.json({ count: activeCount });
  } catch (err) {
    console.error("Error in /users/active:", err);
    res.status(500).json({ message: "Server error" });
  }
});




    // ================== Admin Home ends =============



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