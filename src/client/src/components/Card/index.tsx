import React from 'react'
import type { BoxProps } from '@chakra-ui/layout'
import { Box } from '@chakra-ui/react'

type CardProps = {
  children?: React.ReactNode
} & BoxProps

export function Card({ children, ...props }: CardProps) {
  return (
    <Box
      backgroundColor="brand.200"
      padding="10"
      borderRadius="lg"
      boxShadow="brand.100"
      {...props}
    >
      {children}
    </Box>
  )
}
