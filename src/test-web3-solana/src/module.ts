/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
  AccountInfo,
} from '@solana/web3.js';
import fs from 'mz/fs';
import path from 'path';
import * as borsh from 'borsh';
import BN from "bn.js";

import {
  parseMappingData,
  parsePriceData,
  parseProductData,
} from "@pythnetwork/client";

import { getAdminAccount, getRpcUrl, createKeypairFromFile, chunks} from './utils';

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
 * Path to program files
 */
const PROGRAM_PATH = path.resolve(__dirname, '../../../dist/program');

/**
 * Path to program shared object file which should be deployed on chain.
 * This file is created when running either:
 *   - `npm run build:program-c`
 *   - `npm run build:program-rust`
 */
const PROGRAM_SO_PATH = path.join(PROGRAM_PATH, 'vera.so');

/**
 * Path to the keypair of the deployed program.
 * This file is created when running `solana program deploy dist/program/vera.so`
 */
const PROGRAM_KEYPAIR_PATH = path.join(PROGRAM_PATH, 'vera-keypair.json');

/**
 * Oracle PublicKey to get Tokens' price from Oracle cluster
 * 
 */
const ORACLE_PUBLIC_KEY = "BmA9Z6FjioHJPpjT39QazZyhDRUdZy2ezwx4GiDdE2u2";


let priceList:any[] = [];
/**
 * A state account managed by the vera program(solana project)
 */
class StateAccount {
  counter = 0;
  constructor(fields: {counter: number} | undefined = undefined) {
    if (fields) {
      this.counter = fields.counter;
    }
  }
}

/**
 * Borsh schema definition for state accounts
 */
const StateSchema = new Map([
  [StateAccount, {kind: 'struct', fields: [['counter', 'u32']]}],
]);

/**
 * The expected size of state account.
 */
const STATE_SIZE = borsh.serialize(
  StateSchema,
  new StateAccount(),
).length;




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
  connection = new Connection(rpcUrl, 'confirmed');
  const version = await connection.getVersion();
  console.log('Connection to cluster established:', rpcUrl, version);
}

/**
 * Establish an account to pay for everything
 */
export async function establishAdminAccount(): Promise<void> {
  let fees = 0;
  if (!admin) {
    const {feeCalculator} = await connection.getRecentBlockhash();

    // Calculate the cost to fund the state account
    fees += await connection.getMinimumBalanceForRentExemption(STATE_SIZE);

    // Calculate the cost of sending transactions
    fees += feeCalculator.lamportsPerSignature * 100; // wag

    admin = await getAdminAccount();
  }

  let lamports = await connection.getBalance(admin.publicKey);
  if (lamports < fees) {
    // If current balance is not enough to pay for fees, request an airdrop
    const sig = await connection.requestAirdrop(
      admin.publicKey,
      fees - lamports,
    );
    await connection.confirmTransaction(sig);
    lamports = await connection.getBalance(admin.publicKey);
  }

  console.log(
    'Using account',
    admin.publicKey.toBase58(),
    'containing',
    lamports / LAMPORTS_PER_SOL,
    'SOL to pay for fees',
  );
}

/**
 * Check if the solana BPF program has been deployed
 */
export async function checkProgram(): Promise<void> {
  // Read program id from keypair file
  try {
    const programKeypair = await createKeypairFromFile(PROGRAM_KEYPAIR_PATH);
    programId = programKeypair.publicKey;
  } catch (err) {
    const errMsg = (err as Error).message;
    throw new Error(
      `Failed to read program keypair at '${PROGRAM_KEYPAIR_PATH}' due to error: ${errMsg}. Program may need to be deployed with \`solana program deploy dist/program/vera.so\``,
    );
  }

  // Check if the program has been deployed
  const programInfo = await connection.getAccountInfo(programId);
  if (programInfo === null) {
    if (fs.existsSync(PROGRAM_SO_PATH)) {
      throw new Error(
        'Program needs to be deployed with `solana program deploy dist/program/vera.so`',
      );
    } else {
      throw new Error('Program needs to be built and deployed');
    }
  } else if (!programInfo.executable) {
    throw new Error(`Program is not executable`);
  }
  console.log(`Using program Id: ${programId.toBase58()}`);

  // Derive the address (public key) of a state account from the program so that it's easy to find later.
  const VERA_SEED = 'vera-seed';
  storedPubkey = await PublicKey.createWithSeed(
    admin.publicKey,
    VERA_SEED,
    programId,
  );

  // Check if the state account has already been created
  const stateAccount = await connection.getAccountInfo(storedPubkey);
  if (stateAccount === null) {
    console.log('Creating account', storedPubkey.toBase58());
    const lamports = await connection.getMinimumBalanceForRentExemption(
      STATE_SIZE,
    );

    const transaction = new Transaction().add(
      SystemProgram.createAccountWithSeed({
        fromPubkey: admin.publicKey,
        basePubkey: admin.publicKey,
        seed: VERA_SEED,
        newAccountPubkey: storedPubkey,
        lamports,
        space: STATE_SIZE,
        programId,
      }),
    );
    await sendAndConfirmTransaction(connection, transaction, [admin]);
  }
}


/**
 * 
 * Get Tokens' Price List from Pyth.net
 */
export async function getTokensPriceList(): Promise<void> {
  // read mapping account
  const publicKey = new PublicKey(ORACLE_PUBLIC_KEY);

  try {
    const accountInfo = await connection.getAccountInfo(publicKey);
    
    if (!accountInfo || !accountInfo.data) {
      return;
    }
    const {
      productAccountKeys,
      nextMappingAccount,
    } = parseMappingData(accountInfo.data);
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
      const key = productsInfos.keys[i];

      const productData = productsData[i];
      const product = productData.product;
      const symbol = product["symbol"];
      const priceAccountKey = productData.priceAccountKey;
      const priceInfo = priceInfos.array[i];

      // console.log(
      //   `Product ${symbol} key: ${key} price: ${priceInfos.keys[i]}`
      // );
      
      if (!accountInfo || !accountInfo.data) return;
      
      const price = parsePriceData(priceInfo.data);
      if (price.priceType !== 1)
        console.log('Not 1:',symbol, price.priceType, price.nextPriceAccountKey);
      
      // console.log('Price data:', symbol, price.price);
      // console.log(priceList)
      priceList.push({'Symbol' : symbol, 'Price': price.price})

    }
  } catch (e) {
    console.warn(
      e
    );
  }
}

/**
 * Save Price
 */
export async function savePrice(price : string): Promise<void> {
  
  const pubKey = storedPubkey.toBase58();
  console.log('Save Price to this state account:', pubKey);

  const instruction = new TransactionInstruction({
    keys: [{pubkey: storedPubkey, isSigner: false, isWritable: true}],
    programId,
    data: Buffer.from(price, 'utf8'),
  });
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [admin],
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

/**
 * Get Price from stored Public kay
 */
export async function getPrice(pubKey : string): Promise<void> {
  console.log('Pub Key====>', pubKey);
  const accountInfo = await connection.getAccountInfo(new PublicKey(pubKey));
  if (accountInfo === null) {
    throw 'Error: cannot find the state account';
  }
  const state = borsh.deserialize(
    StateSchema,
    StateAccount,
    accountInfo.data,
  );
  console.log('Price:', state.counter);
}
