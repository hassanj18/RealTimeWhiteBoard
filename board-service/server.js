const express = require('express')
const app = express()
const router=require("./routes")
const authMiddleware=require("./middlewares/authmiddleware")
const cors = require('cors');
app.use(express.json());
app.use(
    cors({
      origin: (_origin, cb) => cb(null, true),
      credentials: true,
    })
  );
app.use(authMiddleware("change-me-access"));
app.use("/board",router)
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const mongoose=require('mongoose')

mongoose.connect('mongodb://localhost:27017/BoardDB')
.then(() => {
    console.log('MongoDB connected')
})
.catch((err) => {
    console.log(err)
})
const PORT=process.env.PORT || 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
