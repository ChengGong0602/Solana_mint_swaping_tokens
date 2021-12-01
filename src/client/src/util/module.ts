import {
  Keypair,
  Connection,
  PublicKey,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
  AccountInfo,
} from "@solana/web3.js";

import {
  parseMappingData,
  parsePriceData,
  parseProductData,
} from "@pythnetwork/client";

import { getRpcUrl, chunks } from "./utils";

/**
 * Connection to the network
 */
let connection: Connection;

/**
 * Keypair associated to the fees' payer(admin)
 */
let admin: Keypair;

/**
 * program id
 */
let programId: PublicKey;

/**
 * The public key of the account we are storing data (Price for now)
 */
let storedPubkey: PublicKey;

/**
 * Oracle PublicKey to get Tokens' price from Oracle cluster
 *
 */
const ORACLE_PUBLIC_KEY = "BmA9Z6FjioHJPpjT39QazZyhDRUdZy2ezwx4GiDdE2u2";

let priceList: any[] = [];

export const getMultipleAccounts = async (
  connection: any,
  keys: string[],
  commitment: string
) => {
  const result = await Promise.all(
    chunks(keys, 99).map((chunk) =>
      getMultipleAccountsCore(connection, chunk, commitment)
    )
  );

  const array = result
    .map(
      (a) =>
        a.array
          .map((acc) => {
            if (!acc) {
              return undefined;
            }

            const { data, ...rest } = acc;
            const obj = {
              ...rest,
              data: Buffer.from(data[0], "base64"),
            } as AccountInfo<Buffer>;
            return obj;
          })
          .filter((_) => _) as AccountInfo<Buffer>[]
    )
    .flat();
  return { keys, array };
};

const getMultipleAccountsCore = async (
  connection: any,
  keys: string[],
  commitment: string
) => {
  const args = connection._buildArgs([keys], commitment, "base64");

  const unsafeRes = await connection._rpcRequest("getMultipleAccounts", args);
  if (unsafeRes.error) {
    throw new Error(
      "failed to get info about account " + unsafeRes.error.message
    );
  }

  if (unsafeRes.result.value) {
    const array = unsafeRes.result.value as AccountInfo<string[]>[];
    return { keys, array };
  }

  // TODO: fix
  throw new Error();
};

/**
 * Establish a connection to the cluster
 */
export async function establishConnection(): Promise<void> {
  const rpcUrl = await getRpcUrl();
  connection = new Connection(rpcUrl, "confirmed");
  const version = await connection.getVersion();
  console.log("Connection to cluster established:", rpcUrl, version);
}

/**
 *
 * Get Tokens' Price List from Pyth.net
 */
export async function getTokensPriceList(): Promise<void> {
  // read mapping account
  const publicKey = new PublicKey(ORACLE_PUBLIC_KEY);
  priceList = [];  
  try {
    const accountInfo = await connection.getAccountInfo(publicKey);

    if (!accountInfo || !accountInfo.data) {
      return;
    }
    const { productAccountKeys, nextMappingAccount } = parseMappingData(
      accountInfo.data
    );
    let allProductAccountKeys = [...productAccountKeys];
    let anotherMappingAccount = nextMappingAccount;

    while (anotherMappingAccount) {
      const accountInfo = await connection.getAccountInfo(
        anotherMappingAccount
      );
      if (!accountInfo || !accountInfo.data) {
        anotherMappingAccount = null;
      } else {
        const { productAccountKeys, nextMappingAccount } = parseMappingData(
          accountInfo.data
        );
        allProductAccountKeys = [
          ...allProductAccountKeys,
          ...productAccountKeys,
        ];
        anotherMappingAccount = nextMappingAccount;
      }
    }

    // setIsLoading(false);
    // setNumProducts(productAccountKeys.length);
    const productsInfos = await getMultipleAccounts(
      connection,
      productAccountKeys.map((p) => p.toBase58()),
      "confirmed"
    );
    const productsData = productsInfos.array.map((p) =>
      parseProductData(p.data)
    );
    const priceInfos = await getMultipleAccounts(
      connection,
      productsData.map((p) => p.priceAccountKey.toBase58()),
      "confirmed"
    );
    for (let i = 0; i < productsInfos.keys.length; i++) {
      // const key = productsInfos.keys[i];

      const productData = productsData[i];
      const product = productData.product;
      const symbol = product["symbol"];
      // const priceAccountKey = productData.priceAccountKey;
      const priceInfo = priceInfos.array[i];

      // console.log(
      //   `Product ${symbol} key: ${key} price: ${priceInfos.keys[i]}`
      // );

      if (!accountInfo || !accountInfo.data) return;

      const price = parsePriceData(priceInfo.data);
      if (price.priceType !== 1)
        console.log(
          "Not 1:",
          symbol,
          price.priceType,
          price.nextPriceAccountKey
        );

      // console.log('Price data:', symbol, price.price);
      // console.log(priceList)
      priceList.push({ Symbol: symbol, Price: price.price });
    }
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Save Price
 */
export async function savePrice(price: string): Promise<void> {
  const pubKey = storedPubkey.toBase58();
  console.log("Save Price to this state account:", pubKey);

  const instruction = new TransactionInstruction({
    keys: [{ pubkey: storedPubkey, isSigner: false, isWritable: true }],
    programId,
    data: Buffer.from(price, "utf8"),
  });
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [admin]
  );
}

/**
 * Get Public Key
 */
export function getPubKey(): String {
  return storedPubkey.toBase58();
}

/**
 * Get Price List
 */
export function getPriceList(): any[] {
  return priceList;
}
