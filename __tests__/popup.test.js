const puppeteer = require('puppeteer');

describe('Popup Page', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
    await page.goto(`file://${__dirname}/../web_extension/chrome/popup.html`);
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should display the correct title', async () => {
    const title = await page.title();
    expect(title).toBe('Craigslist to JSON');
  });
});

import { someFunction } from '../web_extension/chrome/popup';

test('hello world!', () => {
	expect(someFunction()).toBe('expected value');
});