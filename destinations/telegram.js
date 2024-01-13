import TelegramBot from "node-telegram-bot-api";

export const sendTelegramMessage = (message) => {
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  const chatId = process.env.TELEGRAM_CHAT_ID;
  bot.sendMessage(chatId, message);
};
