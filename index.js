const puppeteer = require('puppeteer');
const brightDataSdk = require('@brightdata/automation-sdk');
const { Pool } = require('pg');

const pool = new Pool({
    user: '<DB_USER>',
    host: '<DB_HOST>',
    database: '<DB_NAME>',
    password: '<DB_PASSWORD>',
    port: '<DB_PORT>',
});

async function runScraping() {
    try {
        const browser = await brightDataSdk.puppeteer.connect({
            browserWSEndpoint: 'wss://zproxy.lum-superproxy.io:34434',
            username: '<BrightData username>',
            password: '<BrightData password>',
        });

        const page = await browser.newPage();

        for (let i = 0; i < 100; i++) { // adjust this based on how many pages you need to scrape
            await page.goto(`https://www.zillow.com/boston-ma/apartments/${i}_p`);

            let data = await page.evaluate(() => {
                let properties = Array.from(document.querySelectorAll('.list-card-info'));
                return properties.map(property => {
                    return {
                        name: property.querySelector('.list-card-heading').innerText,
                        address: property.querySelector('.list-card-addr').innerText,
                        price: property.querySelector('.list-card-price').innerText
                    };
                });
            });

            // Insert data into PostgreSQL
            for (let property of data) {
                await pool.query('INSERT INTO properties(name, address, price) VALUES($1, $2, $3)', [property.name, property.address, property.price]);
            }

            await new Promise(resolve => setTimeout(resolve, 2000)); // wait before going to next page
        }

        await browser.close();

    } catch (error) {
        console.error(error);
    }
}

// Run the scraping operation
runScraping();
