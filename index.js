import TelegramBot from "node-telegram-bot-api";
import express from "express";
import axios from "axios";
import Fuse from "fuse.js";
import dotenv from "dotenv";

dotenv.config();

// ---------- Bot & Server ----------
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const app = express();

app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// ---------- Main Menu ----------
function mainMenu(chatId) {
  bot.sendMessage(chatId, "🏠 منوی اصلی", {
    reply_markup: {
      keyboard: [
        ["🔍 جستجوی محصول"],
        ["📞 ارتباط با ما", "📢 کانال اصلی"]
      ],
      resize_keyboard: true
    }
  });
}

// ---------- Get Products from Google Sheets ----------
async function getProducts() {
  const url = `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json`;
  const res = await axios.get(url);
  const json = JSON.parse(res.data.substring(47).slice(0, -2));

  return json.table.rows.map(r => ({
    name: r.c[0]?.v || "",
    price: r.c[1]?.v || "",
    specs: r.c[2]?.v || "",
    status: r.c[3]?.v || "نامشخص"
  }));
}

// ---------- /start ----------
bot.onText(/\/start/, msg => {
  mainMenu(msg.chat.id);
});

// ---------- Messages ----------
bot.on("message", async msg => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  if (text === "🔍 جستجوی محصول") {
    return bot.sendMessage(chatId, "✍️ نام محصول مورد نظر را وارد کنید:");
  }

  if (text === "📞 ارتباط با ما") {
    return bot.sendMessage(
      chatId,
`📞 ارتباط با ما

💬 تلگرام: @m1348sh
📱 09143531348
🛒 برای خرید و مشاوره پیام دهید`
    );
  }

  if (text === "📢 کانال اصلی") {
    return bot.sendMessage(
      chatId,
`📢 کانال اصلی تأسیساتی اسحقی
https://t.me/tasisatyeshagi`
    );
  }

  // ---------- Product Search ----------
  const products = await getProducts();
  const fuse = new Fuse(products, {
    keys: ["name"],
    threshold: 0.4
  });

  const result = fuse.search(text);

  if (!result.length) {
    return bot.sendMessage(
      chatId,
`❌ محصولی با این نام پیدا نشد

📩 برای راهنمایی با ادمین تماس بگیرید:
@m1348sh`
    );
  }

  const p = result[0].item;

  bot.sendMessage(
    chatId,
`🛒 نام کالا: ${p.name}
💰 قیمت: ${p.price}
📦 وضعیت: ${p.status}

📝 مشخصات:
${p.specs}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🌐 جستجوی عمیق اینترنتی", callback_data: `deep_${p.name}` }],
          [{ text: "🔙 بازگشت به منو", callback_data: "back" }]
        ]
      }
    }
  );
});

// ---------- Deep Search (DuckDuckGo) ----------
bot.on("callback_query", async q => {
  const chatId = q.message.chat.id;

  if (q.data === "back") {
    return mainMenu(chatId);
  }

  if (q.data.startsWith("deep_")) {
    const query = q.data.replace("deep_", "");

    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await axios.get(searchUrl);

    const cleanText = res.data
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .substring(0, 700);

    bot.sendMessage(
      chatId,
`🌐 جستجوی عمیق اینترنتی

🔍 محصول: ${query}

📝 اطلاعات کلی:
${cleanText}...

🔗 لینک سرچ:
https://duckduckgo.com/?q=${encodeURIComponent(query)}`
    );
  }
});
