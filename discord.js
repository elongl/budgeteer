import Discord from "discord.js";

export const sendDiscordMessage = (message) => {
  const bot = new Discord.Client({
    intents: [],
  });
  bot.login(process.env.DISCORD_BOT_TOKEN);
  bot.on(Discord.Events.ClientReady, async () => {
    const channel = await bot.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    channel.send(message);
    bot.destroy();
  });
};
