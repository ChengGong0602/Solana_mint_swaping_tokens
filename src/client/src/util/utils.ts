// import os from 'os';
// import path from 'path';
// import yaml from 'yaml';
// import {Keypair} from '@solana/web3.js';


/**
 * Load and parse the Solana CLI config file to determine which RPC url to use
 */
export async function getRpcUrl(): Promise<string> {
//   try {
//     const config = await getConfig();
//     if (!config.json_rpc_url) throw new Error('Missing RPC URL');
//     return config.json_rpc_url;
//   } catch (err) {
//     console.warn(
//       'Failed to read RPC url from CLI config file, falling back to localhost',
//     );
//     //return 'http://localhost:8899';
//     // return 'https://api.testnet.solana.com';
    
//   }
    return 'https://api.devnet.solana.com';
}


export function chunks<T>(array: T[], size: number): T[][] {
  return Array.apply(
    0,
    new Array(Math.ceil(array.length / size))
  ).map((_, index) => array.slice(index * size, (index + 1) * size));
}