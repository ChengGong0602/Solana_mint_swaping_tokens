/**
 * Save Price
 */

 import {
  establishConnection,
  getTokensPriceList,
  getPriceList,
} from './module';

import axios from 'axios';

async function getMarketCapData() : Promise<any>{
  return new Promise((resolve) => {
    axios.get("https://api.veracurrency.com/v1.0/mcap/getSymbolShares").then((response) => {
      resolve(response.data);
    });
  })
}

export async function getPrice() {

  // Establish connection to the cluster
  await establishConnection();

  // Retrieve Tokens' Price List from Pyth network
  await getTokensPriceList();

  const priceList = getPriceList();

  const marketCapList = await getMarketCapData();

  let result = [];
  for(let i = 0; i < marketCapList.length; i ++) {
    let res = priceList.find((e) => e.Symbol === marketCapList[i].Symbol);

    if(res)
      result.push({ ...res, "NumberOfSharesOutstanding": marketCapList[i].NumberOfSharesOutstanding }) 
  }
  // console.log(result)

  let price = 0;

  result.map(r => {
    price += r.NumberOfSharesOutstanding * r.Price;
  })

  // console.log('Success to get Price !', price);

  return price / 10000000000;
}

