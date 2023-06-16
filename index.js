import { CompanyTypes, createScraper } from "israeli-bank-scrapers";
import dotenv from "dotenv";

dotenv.config();

const main = async () => {
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

  let totalCharged = 0;
  scrapeResult.accounts.forEach((account) => {
    account.txns.forEach((txn) => {
      // The charge amount is negative.
      totalCharged -= txn.chargedAmount;
    });
  });
  console.log(`Total charged: ${totalCharged}`);
};

main();
