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

const initMonths = (startDate) => {
  const now = new Date();
  const months = {};
  while (startDate <= now) {
    months[getMonthKey(startDate)] = 0;
    startDate.setMonth(startDate.getMonth() + 1);
  }
  return months;
};

const getChargePerMonth = (scrapeResult, startDate) => {
  const chargePerMonth = initMonths(startDate);
  scrapeResult.accounts.forEach((account) => {
    account.txns.forEach((transaction) => {
      const monthKey = getMonthKey(new Date(transaction.date));
      // The charge amount is negative.
      chargePerMonth[monthKey] -= transaction.chargedAmount;
    });
  });

  return chargePerMonth;
};

const getStartDate = (monthsBack) => {
  const previousMonthDate = new Date();
  previousMonthDate.setDate(1);
  for (let index = 0; index < monthsBack; index++) {
    previousMonthDate.setDate(0);
    previousMonthDate.setDate(1);
  }
  return previousMonthDate;
};

const getMonthKey = (day) =>
  `${day.toLocaleString("en-US", { month: "short" })}-${day.getFullYear()}`;

const getCurrentMonthKey = () => getMonthKey(new Date());

const getDebtFromPrevMonths = (chargePerMonth, budget) => {
  const currentMonth = getCurrentMonthKey();
  const prevMonthsWithDebt = Object.entries(chargePerMonth).filter(
    ([month, charge]) => month != currentMonth && charge > budget
  );
  return prevMonthsWithDebt.reduce(
    (acc, [, charge]) => acc + (charge - budget),
    0
  );
};

const sendMsg = (message) => {
  const dest_handler_map = {
    telegram: sendTelegramMessage,
    discord: sendDiscordMessage,
  };
  const dests = process.env.DESTINATIONS.split(",");
  dests.forEach((dest) => {
    const resolved_dest = dest_handler_map[dest.toLocaleLowerCase()];
    if (resolved_dest) {
      resolved_dest(message);
    } else {
      console.error(`Destination '${dest}' is not supported.`);
    }
  });
};

const main = async () => {
  try {
    const monthsBack = process.env.MONTHS_BACK
      ? Number(process.env.MONTHS_BACK)
      : 0;
    const startDate = getStartDate(monthsBack);
    const budget = parseBudget();
    const scrapeResult = await scrape(startDate);
    const chargePerMonth = getChargePerMonth(scrapeResult, startDate);
    const currentCharge = chargePerMonth[getCurrentMonthKey()];
    const debtFromPreviousMonths = getDebtFromPrevMonths(
      chargePerMonth,
      budget
    );
    const cashAvailableThisMonth =
      budget - currentCharge - debtFromPreviousMonths;

    const msg = `
  Budget: ₪${budget.toFixed(2)}
  Current month's charge: ₪${currentCharge.toFixed(2)}
  Debt from previous months: ₪${debtFromPreviousMonths.toFixed(2)}
  Cash available to spend this month: ₪${cashAvailableThisMonth.toFixed(2)}
  `;
    sendMsg(msg);
  } catch (err) {
    const errMsg = `Error: ${err.message}`;
    console.error(errMsg);
    sendMsg(errMsg);
  }
};

main();
