import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import fs from "fs";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

/* ================= EXPRESS (Render) ================= */
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Telegram AI Bot is running!");
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

/* ================= TELEGRAM BOT ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let infoText = "";
let productsText = "";

/* ================= LOAD FILES ================= */
function loadTexts() {
  infoText = fs.readFileSync("./data/info.txt", "utf-8");
  productsText = fs.readFileSync("./data/products.txt", "utf-8");
  console.log("Text files loaded / updated");
}

loadTexts();

/* ================= 🔁 HOT RELOAD ================= */
fs.watch("./data", (event, filename) => {
  if (filename === "info.txt" || filename === "products.txt") {
    setTimeout(loadTexts, 500);
  }
});

/* ================= AI FUNCTION ================= */
async function askAI(question) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
تو یک ربات فروشگاهی هستی.
فقط اجازه داری از اطلاعات زیر استفاده کنی.

[اطلاعات فروشگاه]
${infoText}

[محصولات]
${productsText}

قوانین:
- سوال نامربوط → فقط بنویس: از موضوع خارج شدید
- سوال مرتبط ولی پاسخ ندارد → فقط بنویس: سؤال مورد نظر شما ذکر نشده است
- هیچ دانش دیگری استفاده نکن
        `
      },
      { role: "user", content: question }
    ]
  });

  return res.choices[0].message.content.trim();
}

/* ================= MESSAGE HANDLER ================= */
bot.on("message", async (msg) => {
  if (!msg.text) return;

  const chatId = msg.chat.id;
  const question = msg.text;

  try {
    const answer = await askAI(question);
    await bot.sendMessage(chatId, answer);

    if (answer === "سؤال مورد نظر شما ذکر نشده است") {
      await bot.sendMessage(
        process.env.ADMIN_ID,
        `❓ سوال جدید:\n\n${question}`
      );
    }
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "خطا در ارتباط با سرور");
  }
});
