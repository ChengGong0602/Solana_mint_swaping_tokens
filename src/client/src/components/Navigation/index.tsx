import VeraLogo from 'assets/logo.svg'
import React from 'react'

import { Box, VStack } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartBar } from '@fortawesome/free-solid-svg-icons'

export function Navigation() {
  return (
    <Box
      flexBasis="5rem"
      backgroundColor="brand.200"
      borderRight="1px solid gray"
    >
      <Box as="nav" position="fixed" width="5rem">
        <VStack color="white" fontSize={30} spacing={10} marginTop={10}>
          <Link to="/">
            <Box boxSize={10}>
              <img src={VeraLogo} alt="Vera Logo" />
            </Box>
          </Link>
          <Link to="/graph">
            <FontAwesomeIcon icon={faChartBar} />
          </Link>
        </VStack>
      </Box>
    </Box>
  )
}
