import {
  establishConnection,
  checkProgram,
  getPrice,
} from './module';

async function main() {
  console.log("Now is Connecting to RPC...");

  // Establish connection to the cluster
  await establishConnection();

  //TODO:
  //Get Pub Key from API
  const pubKey = 'BMYtfh7a6Ftw2qayjivxmYfq2zNkaa1TAntonkCDEnP7';

  // Get Price from stored Pub key
  await getPrice(pubKey);

  console.log('Success to get Price');
}

main().then(
  () => process.exit(),
  err => {
    console.error(err);
    process.exit(-1);
  },
);
