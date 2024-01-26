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

const scrape = async (startDate) => {
  const options = {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    startDate,
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
  let totalCharged = {};
  let monthYearTuple = "";

  scrapeResult.accounts.forEach((account) => {
    account.txns.forEach((txn) => {
      monthYearTuple = getMonthYearTupleOfADay(new Date(txn.date));
      if (!(monthYearTuple in totalCharged)) {
        totalCharged[monthYearTuple] = 0;
      }

      // The charge amount is negative.
      totalCharged[monthYearTuple] -= txn.chargedAmount;
    });
  });

  Object.keys(totalCharged).forEach((monthYear) => {
    totalCharged[monthYear] = Math.round(totalCharged[monthYear] * 100) / 100;
  });

  return totalCharged;
};

const getPreviousMonthDate = (numberOfMonthsBack) => {
  let previousMonthDate = new Date();
  previousMonthDate.setDate(1);
  for (let index = 0; index < numberOfMonthsBack; index++) {
    previousMonthDate.setDate(0);
    previousMonthDate.setDate(1);
  }
  return previousMonthDate;
};

const createMessageForCurrentMonth = (currentMonthCharges, budget) => {
  let message;
  const exceed_percent = Math.round((currentMonthCharges / budget) * 100);

  if (currentMonthCharges > budget) {
    message = `Current month budget exceeded: ${currentMonthCharges} > ${budget} (${exceed_percent}%)`;
  } else {
    message = `Current month budget not exceeded: ${currentMonthCharges} <= ${budget} (${exceed_percent}%)`;
  }

  return message;
};

const createMessageForPreviousMonths = (previousCharges, budget) => {
  let message;
  const totalCharges = previousCharges.reduce(
    (partialSum, a) => partialSum + a,
    0
  );
  const exceed_percent = Math.round((totalCharged / budget) * 100);

  if (totalCharges > budget * previousCharges.length) {
    message = `Over the last ${previousCharges.length} months budget exceeded: ${totalCharged} > ${budget} (${exceed_percent}%)`;
  } else {
    message = `Over the last ${previousCharges.length} budget not exceeded: ${totalCharged} <= ${budget} (${exceed_percent}%)`;
  }

  return message;
};

const getMonthYearTupleOfADay = (day) => {
  monthYearTuple = `${day.toLocaleString("en-US", {
    month: "short",
  })}-${day.getFullYear()}`;
};

const main = async () => {
  let message;
  const monthsBack = process.env.MONTHS_BACK
    ? Number(process.env.MONTHS_BACK)
    : 0;
  const budget = parseBudget();
  const scrapeResult = await scrape(getPreviousMonthDate(monthsBack));
  const totalCharged = getTotalCharged(scrapeResult);
  const destinations = process.env.DESTINATIONS.split(",");

  const todayMonthYearTuple = getMonthYearTupleOfADay(now);
  if (todayMonthYearTuple in totalCharged) {
    message = `${createMessageForCurrentMonth(
      totalCharged[todayMonthYearTuple],
      budget
    )}\n`;
  } else {
    message = "There are no charges for this month yet :) \n";
  }

  message += monthsBack
    ? createMessageForPreviousMonths(Object.keys(totalCharged), budget)
    : "";

  destinations.forEach((dest) => {
    if (dest === "TELEGRAM") {
      sendTelegramMessage(message);
    } else if (dest === "DISCORD") {
      sendDiscordMessage(message);
    }
  });
};

main();
