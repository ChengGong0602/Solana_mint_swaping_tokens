import './App.css'
import React from 'react'

import Routes from './routes'
import theme from './theme'

import { Wallet } from 'components'

import { ChakraProvider } from '@chakra-ui/react'

function App() {
  return (
    <Wallet>
      <ChakraProvider theme={theme}>
        <Routes />
      </ChakraProvider>
    </Wallet>
  )
}

export default App