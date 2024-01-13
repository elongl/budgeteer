import { CompanyTypes, createScraper } from "israeli-bank-scrapers";
import { sendTelegramMessage } from "./destinations/telegram.js";
import { sendDiscordMessage } from "./destinations/discord.js";
import dotenv from "dotenv";

dotenv.config();

const parseBudget = () => {
  const budget = Number(process.env.BUDGET_ILS);
  if (isNaN(budget)) {
    throw new Error("Budget is not a number");
  }
  return budget;
};

const scrape = async () => {
  const now = new Date();
  const options = {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    companyId: CompanyTypes.isracard,
    showBrowser: false,
  };

  const credentials = {
    id: process.env.CREDENTIALS_ID,
    card6Digits: process.env.CREDENTIALS_CARD_DIGITS,
    password: process.env.CREDENTIALS_PASSWORD,
  };

  const scraper = createScraper(options);
  const scrapeResult = await scraper.scrape(credentials);

  if (!scrapeResult.success) {
    throw new Error(
      `Failed to scrape: ${scrapeResult.errorType}: ${scrapeResult.errorMessage}`
    );
  }
  return scrapeResult;
};

const getTotalCharged = (scrapeResult) => {
  let totalCharged = 0;
  scrapeResult.accounts.forEach((account) => {
    account.txns.forEach((txn) => {
      // The charge amount is negative.
      totalCharged -= txn.chargedAmount;
    });
  });
  return Math.round(totalCharged * 100) / 100;
};

const main = async () => {
  const budget = parseBudget();
  const scrapeResult = await scrape();
  const totalCharged = getTotalCharged(scrapeResult);
  const destinations = process.env.DESTINATIONS.split(",");
  let message;
  const exceed_percent = Math.round((totalCharged / budget) * 100);
  if (totalCharged > budget) {
    message = `Budget exceeded: ${totalCharged} > ${budget} (${exceed_percent}%)`;
  } else {
    message = `Budget not exceeded: ${totalCharged} <= ${budget} (${exceed_percent}%)`;
  }

  destinations.forEach((dest) => {
    if (dest === "TELEGRAM") {
      sendTelegramMessage(message);
    } else if (dest === "DISCORD") {
      sendDiscordMessage(message);
    }
  });
};

main();
