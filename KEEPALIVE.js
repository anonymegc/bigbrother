const express = require("express");
const app = express();

app.all("/", (req, res) => {
  res.send("Bot is running!");
});

app.listen(10000, () => console.log("Botin pitäisi nyt pysyä hereillä!"));

const KEEP_ALIVE_URL = 'https://bigbrother-a64y.onrender.com'; 
setInterval(async () => {
  try {
    await fetch(KEEP_ALIVE_URL);
    console.log('🟢 Keep-alive ping lähetetty Renderille');
  } catch (err) {
    console.log('⚠️ Keep-alive ping epäonnistui:', err.message);
  }
}, 1000 * 60 * 5);
