import React, { ReactNode } from 'react'

import { Grid, Box } from '@chakra-ui/react'
import { Navigation } from 'components'
import { Outlet } from 'react-router-dom'

import Particles from 'react-particles-js'

export function Layout() {
  return (
    <Grid minHeight="100vh" templateColumns="5rem auto">
      <Navigation />
      <Box padding="2rem">
        <Particles
          width="100%"
          height="100%"
          style={{ position: 'fixed', zIndex: -1 }}
        ></Particles>
        <Outlet />
      </Box>
    </Grid>
  )
}
