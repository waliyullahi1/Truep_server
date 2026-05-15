import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

await mongoose.connect(process.env.MONGO_URI)

console.log("MongoDB connected")

const collection = mongoose.connection.collection("properts")

const docs = await collection.find({
  $or: [
    { slug: null },
    { slug: { $exists: false } },
    { slug: "" }
  ]
}).toArray()

console.log(`Found ${docs.length} broken properties`)

for (const doc of docs) {

  const slug =
    doc.title
      ?.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "") +
    "-" +
    Date.now()

  await collection.updateOne(
    { _id: doc._id },
    {
      $set: {
        slug
      }
    }
  )

  console.log(`Updated: ${doc.title}`)
}

console.log("DONE")

process.exit()