import { Box, Heading, Text } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconProp } from '@fortawesome/fontawesome-svg-core'

type GraphCardProps = {
  icon: IconProp,
  title: string,
  amount: Number | string
}

export function GraphCard({ icon, title, amount }: GraphCardProps) {
  return (
    <Box background="brand.200" padding="10" borderRadius="lg">
      <Text fontSize="4xl">
        <FontAwesomeIcon icon={icon}></FontAwesomeIcon>
      </Text>
      <Heading as="h2" size="lg">
        Total Staked in USDC
      </Heading>
      <Text fontSize="3xl" fontFamily="kameron" fontWeight="bold">
        { amount  === '' ? "Calculating ...": `$${amount}` }
        
      </Text>
    </Box>
  )
}
