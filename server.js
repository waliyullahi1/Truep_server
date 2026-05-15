import dotenv from "dotenv";
dotenv.config();


import express from "express"

import path from "path"
import cors from "cors"
import cookieParser from "cookie-parser"
import mongoose from "mongoose"


import { fileURLToPath } from "url"

import { logger } from "./middleware/logEvent.js"
import errorHandle from "./middleware/erroHandle.js"

import connectDB from "./config/db.js"



import authRoute from "./route/api/auth.js"
import  rootRoute from "./route/root.js"
import profileRoutes from "./route/api/profile.js"
import propertRoutes from "./route/api/property.js"
import kycRoutes from "./route/api/kyc.js"
const app = express()

const PORT = process.env.PORT || 5000

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
console.log("ENV TEST:", process.env.CLOUDINARY_API_KEY);
// Connect DB
connectDB()

// Logger middleware
app.use(logger)

// CORS configuration
const corsOptions = {
  origin: [
    "https://virex.codes",
    "https://www.virex.codes",
    "http://localhost:3000"
  ],
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))

// Middleware
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cookieParser())

// Static files
app.use("/", express.static(path.join(__dirname, "public")))

// Routes
app.use("/", rootRoute)
app.use("/auth", authRoute)
app.use("/profile", profileRoutes)
app.use("/property", propertRoutes)
app.use("/kyc", kycRoutes)
// app.use("/logout", logoutRoute)
// app.use("/refresh", refreshRoute)
// app.use("/dashbord", dashbordRoute)
// app.use("/transaction", transactionRoute)
// app.use("/fund", fundRoute)
// app.use("/resetpassword", resetPasswordRoute)
// app.use("/veryfyJWT", verifyJWT)
// app.use("/valid", verifyRoute)
// app.use("/", smsRoute)
// app.use("/ping", pingRoute)
// app.use("/notices", noticesRoute)


// Test route
app.get(
  "/red(.html)?",
  (req, res, next) => {
    console.log("e")
    next()
  },
  (req, res) => {
    res.send("it is okay")
  }
)

// Error handler
app.use(errorHandle)

// Start server after DB connection
mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB")

  app.listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
  )
})