/**
 * Save Price
 */

 import {
  establishConnection,
  establishAdminAccount,
  checkProgram,
  getTokensPriceList,
  savePrice,
  getPubKey,
  getPriceList,
} from './module';

import axios from 'axios';

async function getMarketCapData() : Promise<any>{
  return new Promise((resolve) => {
    axios.get("https://api.veracurrency.com/v1.0/mcap/getAll").then((response) => {
      resolve(response.data);
    });
  })
}

async function main() {
  console.log("Now is starting to save Price...");

  // Establish connection to the cluster
  await establishConnection();

  // Determine who pays for the fees
  await establishAdminAccount();

  // Check if the program has been deployed
  await checkProgram();

  // Retrieve Tokens' Price List from Pyth network
  await getTokensPriceList();

  const priceList = getPriceList();

  // console.log('PriceList =>', priceList)

  const marketCapList = await getMarketCapData();

  // console.log('MarketCapList =>', marketCapList);

  let result = [];
  for(let i = 0; i < marketCapList.length; i ++) {
    let temp = priceList.find((e) => e.Symbol == marketCapList[i].Symbol);

    if(temp)
      result.push({ "Symbol": temp.Symbol, "Price": parseInt(temp.Price), "MarketCap": parseInt(marketCapList[i].MarketCap.toString()) }) 
  }
  console.log(result)

  let str = ''
  result.map(r => {
      str += `${r.Symbol}#${r.MarketCap}#${r.Price}&`
  })
  str = str.slice(0, -1);
  console.log(str)

  // Save Price
  await savePrice(str);

  //TODO:
  //Calling API, Post Public Key to Backend
  console.log('Posting Public Key to Backend', getPubKey());

  console.log('Success to save Price !');
}

main().then(
  () => process.exit(),
  err => {
    console.error(err);
    process.exit(-1);
  },
);
