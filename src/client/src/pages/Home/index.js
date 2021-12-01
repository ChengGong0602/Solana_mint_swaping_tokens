import React, {useState, useEffect} from 'react'

import {
  Box,
  Button,
  Flex,
  Grid,
  NumberInput,
  NumberInputField,
  Heading,
  HStack,
  Text,
  CircularProgress
} from '@chakra-ui/react'
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { getPrice } from '../../util/getPrice';
import { 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  Token
} from '@solana/spl-token'
import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  Program, Provider, web3, BN
} from '@project-serum/anchor';

import { NETWORK } from '../../constants';
import idl from '../../util/vera_contract.json' // vera_contract.json';

const wallets = [
  /* view list of available wallets at https://github.com/solana-labs/wallet-adapter#wallets */
  getPhantomWallet()
]

const { SystemProgram, Keypair } = web3;
/* create an account  */
const baseAccount = Keypair.generate();
const secondUserKeypair = Keypair.generate();
const opts = {
  preflightCommitment: "processed"
}
const programID = new PublicKey(idl.metadata.address);

const deposite_title = 'Deposite3';

const USDC_MINT_SECRETKEY= new Uint8Array([100,218,64,82,180,82,184,194,184,37,41,224,160,146,82,121,247,148,246,5,179,53,160,190,44,139,149,108,204,99,14,211,218,153,24,30,141,10,47,140,180,174,39,27,207,41,247,200,192,58,148,24,82,89,183,105,140,110,133,247,95,121,178,0]);
const VERA_MINT_SECRETKEY = new Uint8Array([32,106,122,170,131,178,209,139,241,105,167,186,16,202,19,60,168,179,138,173,137,208,127,71,68,40,140,13,172,151,242,126,248,131,231,137,47,93,223,93,82,164,52,235,170,211,114,97,199,199,146,244,195,191,133,137,97,191,104,86,247,162,248,193]);

export default function Home() {
  const format = (val) => val // `$` + val
  const parse = (val) => val.replace(/^\$/, "")
  const convert_vera = (val) => (parseFloat(val === undefined || val === "" ? "0" : val) / parseFloat(price.toString())).toFixed(6)

  const [value, setValue] = React.useState("")
	const [price, setPrice] = useState(0);
  const [waitTx, setWaitTx] = useState(false)
  
  useEffect(() => {
    async function fetchPriceData() {
      const value = await getPrice();
      setPrice(value.toFixed(2));
    }

    const interval = setInterval(() => {
      fetchPriceData();
    }, 10000);
    return () => clearInterval(interval);

  }, [])
  const data = [['USD', '1000']]
  const headers = ['Currency', 'Value']

  const wallet = useWallet()

  const { publicKey } = wallet;

  

  const getProvider = async () => {
    /* create the provider and return it to the caller */
    /* network set to local network for now */
    const network = NETWORK;
    const connection = new Connection(network, opts.preflightCommitment);

    const provider = new Provider(
      connection, wallet, opts.preflightCommitment,
    );
    return provider;
  }

  const airDrop = async () => {
    console.log('airdrop start')
    let connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

    const usdcMint = new PublicKey('3c4N5j8gBNTP3f4YXGyLvYxgwnfgMReZxrGq4SK2a6f8');

    const provider = await getProvider()
    const program = new Program(idl, programID, provider);
    // user's usdc account address
    // const userUsdc = provider.wallet.publicKey;
    const userUsdc = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      usdcMint,
      program.provider.wallet.publicKey
    );
    console.log('airdrop progress', userUsdc.toBase58())

    let airdropSignature = await connection.requestAirdrop(
        provider.wallet.publicKey,
        // userUsdc,
        web3.LAMPORTS_PER_SOL,
    );

    await connection.confirmTransaction(airdropSignature);
  }

  const airDropUSDC = async () => {

    setWaitTx(true);
    const provider = await getProvider()
    const program = new Program(idl, programID, provider);
    // Connect to cluster
    var connection = new web3.Connection(web3.clusterApiUrl("devnet"));
    // Construct wallet keypairs
    var fromWallet = web3.Keypair.fromSecretKey(USDC_MINT_SECRETKEY);
    // var toWallet = web3.Keypair.generate();
    // Construct my token class
    var myMint = new web3.PublicKey("3c4N5j8gBNTP3f4YXGyLvYxgwnfgMReZxrGq4SK2a6f8");
    var myToken = new Token(
      connection,
      myMint,
      TOKEN_PROGRAM_ID,
      fromWallet
    );
    // Create associated token accounts for my token if they don't exist yet
    var fromTokenAccount = await myToken.getOrCreateAssociatedAccountInfo(
      fromWallet.publicKey
    )
    var toTokenAccount = await myToken.getOrCreateAssociatedAccountInfo(
      program.provider.wallet.publicKey
    )
    
    // USDC decimal is 6
    const airdropAmount = 5000 * 1000000;
    // Add token transfer instructions to transaction
    var transaction = new web3.Transaction()
      .add(
        Token.createTransferInstruction(
          TOKEN_PROGRAM_ID,
          fromTokenAccount.address,
          toTokenAccount.address,
          fromWallet.publicKey,
          [],
          airdropAmount
        )
      );
    // Sign transaction, broadcast, and confirm
    var signature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [fromWallet]
    );
    console.log("SIGNATURE", signature);
    console.log("SUCCESS");

    setWaitTx(false);
    alert("Airdrop successed");
  }
  
  const mintVERA = async (mintAmount) => {
    const provider = await getProvider()
    const program = new Program(idl, programID, provider);
    // Connect to cluster
    var connection = new web3.Connection(web3.clusterApiUrl("devnet"));
    // Construct wallet keypairs
    var fromWallet = web3.Keypair.fromSecretKey(VERA_MINT_SECRETKEY);
    // var toWallet = web3.Keypair.generate();
    // Construct my token class
    var myMint = new web3.PublicKey("CN2jeduMaHuehNZNGyyAfvo1DPmAK2zSiX1DHAwkBA8Y");
    var myToken = new Token(
      connection,
      myMint,
      TOKEN_PROGRAM_ID,
      fromWallet
    );
    // Create associated token accounts for my token if they don't exist yet
    var fromTokenAccount = await myToken.getOrCreateAssociatedAccountInfo(
      fromWallet.publicKey
    )
    var toTokenAccount = await myToken.getOrCreateAssociatedAccountInfo(
      program.provider.wallet.publicKey
    )
    
    // Add token transfer instructions to transaction
    var transaction = new web3.Transaction()
      .add(
        Token.createTransferInstruction(
          TOKEN_PROGRAM_ID,
          fromTokenAccount.address,
          toTokenAccount.address,
          fromWallet.publicKey,
          [],
          mintAmount
        )
      );
    // Sign transaction, broadcast, and confirm
    var signature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [fromWallet]
    );
    console.log("SIGNATURE", signature);
    console.log("SUCCESS");
  }

  // Buy/Mint the VERA action
  const buyMint = async () => {
    console.log("Start: minting ....");
    if(value === undefined || value === "" || value === 0) {
      return;
    }

    setWaitTx(true);
    const provider = await getProvider()
    const program = new Program(idl, programID, provider);

    try {
        
      const depositeAccount = new PublicKey('Gr9HZWB5DBdkSzk8kGDQoaZGW91XXn9CJBVQy3ELAi76');
      const redeemableMint = new PublicKey('4T9x3ytK8KnyTEDcQZNxxZkR6ZZUmozphM8CgDCWh1vX');
      const poolUsdc = new PublicKey('HyrG1HKJDJQ8SSjvkMn1QGAZMaHikoF5nnGYzFP3Ag1u');

      const usdcMint = new PublicKey('3c4N5j8gBNTP3f4YXGyLvYxgwnfgMReZxrGq4SK2a6f8');

      // user's usdc account address
      // const userUsdc = provider.wallet.publicKey;
      const userUsdc = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        usdcMint,
        program.provider.wallet.publicKey
      );
      
      // user's VER token account address
      // const userRedeemable = provider.wallet.publicKey;
      const [userRedeemable] = await PublicKey.findProgramAddress(
        [Buffer.from(deposite_title),Buffer.from("user_redeemable")],
        programID
      );

      // multiple USDC decimal (10^6)
      const usdcAmount = value * 1000000;
      // VER_DECIMAL = 8
      // USDC_DECIMAL = 6
      const veraAmount = Math.floor(usdcAmount * 100 / parseFloat(price.toString()));

      // console.log("Token amounts: ", usdcAmount, veraAmount)

      await program.rpc.depositUsdcForRedeemable(
        new BN(usdcAmount), 
        new BN(veraAmount), 
        {
          accounts: {
            userAuthority: provider.wallet.publicKey,
            userUsdc,
            userRedeemable,
            depositeAccount,
            usdcMint,
            redeemableMint,
            poolUsdc,
            tokenProgram: TOKEN_PROGRAM_ID
          }
        },
      );

      await mintVERA(veraAmount);

    } catch (err) {
      console.log("Transaction error: ", err);
      alert("Sorry, transaction failed. Try it again, later.");
    }
    setWaitTx(false);
    alert("Successfully deposited");
  }

  const initializeAccount = async () => {
    const provider = await getProvider()
    const program = new Program(idl, programID, provider);

    try {
      /* interact with the program via rpc */
      let bumps = {
        depositeAccount : null,
        redeemableMint: null,
        poolUsdc: null,
      };

      const [depositeAccount, depositeAccountBump] = await PublicKey.findProgramAddress(
        [Buffer.from(deposite_title)],
        programID
      );
      bumps.depositeAccount = depositeAccountBump;

      const [redeemableMint, redeemableMintBump] = await PublicKey.findProgramAddress(
        [Buffer.from(deposite_title), Buffer.from("redeemable_mint")],
        programID
      );
      bumps.redeemableMint = redeemableMintBump;

      const [poolUsdc, poolUsdcBump] = await PublicKey.findProgramAddress(
        [Buffer.from(deposite_title), Buffer.from("pool_usdc")],
        programID
      );
      bumps.poolUsdc = poolUsdcBump;

      console.log("InitialData", depositeAccount.toBase58(), redeemableMint.toBase58(), poolUsdc.toBase58())

      const depositeAuthority = provider.wallet.publicKey;
      // usdc
      const usdcMint = new PublicKey('3c4N5j8gBNTP3f4YXGyLvYxgwnfgMReZxrGq4SK2a6f8');

      // initialize
      await program.rpc.initialize(
        deposite_title, 
        bumps,
        { 
          accounts: {
            depositeAuthority,
            depositeAccount,
            usdcMint,
            redeemableMint,
            poolUsdc,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: web3.SYSVAR_RENT_PUBKEY,
          },
        }
      );

      const [userRedeemable] = await PublicKey.findProgramAddress(
        [Buffer.from(deposite_title),Buffer.from("user_redeemable")],
        programID
      );

      console.log("init userRedeemable", userRedeemable.toBase58())
      await program.rpc.initUserRedeemable(
        {
          accounts: {
            userAuthority: provider.wallet.publicKey,
            userRedeemable,
            depositeAccount,
            redeemableMint,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: web3.SYSVAR_RENT_PUBKEY,
          }
        },
      );
    } catch (err) {
      console.log("Transaction error: ", err);
    }
  }

  return (
    <>
      <HStack spacing="20" alignItems="start" marginBottom={40}>
        <Box flexBasis="50%">
          <Box color="white" textStyle="h2" fontSize={30}>
            Vera App
          </Box>
        </Box>
        <Flex flexBasis="50%">
          <WalletModalProvider>
            <HStack spacing="20">
              <WalletMultiButton />
              <WalletDisconnectButton />
            </HStack>
          </WalletModalProvider>
        </Flex>
      </HStack>
      <HStack width="100%" marginBottom={20} spacing="20" alignItems="start">
        <Box
          backgroundColor="brand.200"
          padding="10"
          flexBasis="50%"
          borderRadius="lg"
          boxShadow="brand.100"
        >
          <Heading textStyle="h3">Buy VERA </Heading>
          <Text marginY="10">
            {
            price !== 0 ? <Text marginY="10" > Current Price - ${price} USD </Text>
              :
              <Text marginY="10" > Current Price - Now Calculating... </Text>
          	}
          </Text>
          <Text marginY="10">
            Amount to deposit (USDC)
            <NumberInput 
              step={5}
              value={format(value)}
              onChange={(valueString) => setValue(parse(valueString))}
            >
              <NumberInputField />
            </NumberInput>
            <Text marginY="2" fontSize="sm" color="light">
              { value } USDC ≈ { price !== 0 ? convert_vera(value) : " " } VERA
            </Text>
          </Text>
          {
            publicKey ? <div><Button marginX="10" onClick={ buyMint }>Buy</Button><Button onClick={ airDropUSDC }>Air Drop</Button></div> :
            <WalletModalProvider>
              <WalletMultiButton />
            </WalletModalProvider>
          }          
        </Box>        
      </HStack>     
      {
        waitTx ?
        <div style={{ 
          display: 'flex', justifyContent: 'center', 
          alignItems: 'center', position: 'absolute', 
          width: '100%', height: '100%', 
          zIndex: 9999, top: 0, left: 0,
          backgroundColor: '#0008'
        }}>
          <CircularProgress isIndeterminate color="green.300" />
          <div style={{ marginLeft: '20px'}}>
            Waiting for transaction ...
          </div>
        </div>
        : <></>
      } 
    </>
  )
}