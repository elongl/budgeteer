# Budgeteer

A simple program that notifies you when you exceed your budget.  
_Note_: This program is currently only compatible with Isracard.

Supported Destinatons

```
TELEGRAM
DISCORD
```

## Setup

1. Create the following `.env` file:

```bash
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=<chrome path>

CREDENTIALS_ID=<user identification number>
CREDENTIALS_CARD_DIGITS=<last 6 digits of card>
CREDENTIALS_PASSWORD=<password>

BUDGET_ILS=<budget in ILS>

DESTINATIONS=<comma deperated list of uppercase destinations>
MONTHS_BACK=<number of previous months to calculate the budget>

TELEGRAM_BOT_TOKEN=<telegram bot token>
TELEGRAM_CHAT_ID=<telegram chat id>

DISCORD_BOT_TOKEN=<discord bot token>
DISCORD_CHANNEL_ID=<discord channel id>
```

2. Install the package

```bash
npm install
```

3. Run the program

```bash
npm start
```
