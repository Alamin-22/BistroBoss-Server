const express = require("express");
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const prot = process.env.PORT || 5000;


// middleware
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174",],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
}));
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4hda1bm.mongodb.net/?retryWrites=true&w=majority`;

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

        const menuCollection = client.db("BistroDB").collection("MenuFix");
        const reviewsCollection = client.db("BistroDB").collection("reviews");
        const cartCollection = client.db("BistroDB").collection("carts");
        const UserCollection = client.db("BistroDB").collection("users");




        // jwt related 

        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
            res.send({ token });
        })


        // middle ware

        const verifyToken = (req, res, next) => {
            // console.log("checking inside the verify token", req.headers.authorization);

            if (!req.headers.authorization) {
                return res.status(401).send({ message: "Unauthorized Access" })
            }
            const token = req.headers.authorization.split(" ")[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
                if (err) {
                    return res.status(401).send({ message: " Unauthorized Access" })
                }
                req.decode = decode;
                next();
            })
        }

        // verify admin

        const verifyAdmin = async (req, res, next) => {
            const email = req.decode.email;
            const query = { email: email };
            const user = await UserCollection.findOne(query);
            const isAdmin = user?.role === "admin";
            if (!isAdmin) {
                return res.status(403).send({ message: "Forbidden Access" });
            }
            next();
        }


        // 
        app.get("/menu", async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result);
        })
        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            console.log("checking query", query)
            const result = await menuCollection.findOne(query);
            res.send(result);
        })

        app.post("/menu", async (req, res) => {
            const item = req.body;
            const result = await menuCollection.insertOne(item);
            res.send(result);
        })


        app.patch("/menu/:id", async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    recipe: item.recipe,
                    image: item.image
                }
            }

            const result = await menuCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })



        // delete menu
        app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await menuCollection.deleteOne(query);
            console.log(query)
            res.send(result);
        })

        app.get("/reviews", async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result);
        })


        // users collections


        // user admin

        app.get("/users/admin/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decode.email) {
                return res.status(403).send({ message: "Forbidden Access" })
            }

            const query = { email: email };
            const user = await UserCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === "admin"
            }
            res.send({ admin });
        })


        app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
            const result = await UserCollection.find().toArray();
            res.send(result);
        })
        app.get("/users/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await UserCollection.find(query).toArray();
            res.send(result);
        })

        app.post("/users", async (req, res) => {
            const user = req.body;
            // insert email if user dosent exist
            //  i can do this many ways (1. email unique, upsert, simple checking)
            const query = { email: user.email };
            const existingUser = await UserCollection.find(query).toArray();
            // console.log(query);
            console.log(existingUser);
            if (existingUser.length > 0) {
                return res.send({ message: "user ALready Exist ", insertedId: null })
            }
            const result = await UserCollection.insertOne(user)
            res.send(result);
        })

        // 
        app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: "admin"
                }
            }
            const result = await UserCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await UserCollection.deleteOne(query);
            res.send(result);
        })



        // carts collections


        app.get("/carts", async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })


        app.post("/carts", async (req, res) => {
            const cartItem = req.body;
            console.log(cartItem);
            const result = await cartCollection.insertOne(cartItem);
            res.send(result);
        })

        app.delete("/carts/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query);
            res.send(result)
        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Boss server is Running")
});

app.listen(prot, () => {
    console.log(`Bistro boss server is running on port : ${prot}`);
})