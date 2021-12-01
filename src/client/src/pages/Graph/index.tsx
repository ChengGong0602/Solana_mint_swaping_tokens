import React, { useEffect, useState } from 'react'

import { Box, Grid, Heading, Text } from '@chakra-ui/react'
import { Connection, PublicKey } from '@solana/web3.js';

import { faBroom } from '@fortawesome/free-solid-svg-icons'

import { GraphCard } from 'components'
import { NETWORK } from '../../constants';

export default function Graph() {
  const [stakedAmount, setStakedAmount] = useState('')

  const poolUsdc = new PublicKey('HyrG1HKJDJQ8SSjvkMn1QGAZMaHikoF5nnGYzFP3Ag1u');

  useEffect(() => {
    let chk = true;
    const getStakedAmount = async () => {
      const connection = new Connection(NETWORK, "processed");
      const poolUSDCBalance = (await connection.getTokenAccountBalance(poolUsdc, "processed")).value;
      console.log("StakedAmount", poolUSDCBalance.amount)
      if(!chk) return;

      setStakedAmount(Math.floor(parseInt(poolUSDCBalance.amount) / 1000000).toString());
    }
    const interval = setInterval(() => {
      getStakedAmount();
    }, 10000);

    return () => {
      chk = false;
      clearInterval(interval);
    }
  }, []);

  return (
    <>
      <Grid spacing="20" gridTemplateColumns="repeat(3, 1fr)">
        <GraphCard icon={faBroom} title="" amount={stakedAmount}></GraphCard>
      </Grid>
    </>
  )
}
