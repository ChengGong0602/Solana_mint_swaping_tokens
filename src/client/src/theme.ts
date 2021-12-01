import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  colors: {
    brand: {
      100: '#10122d',
      200: '#212138',
      blue: {
        100: '#3964d0',
        500: '#2dc1c9',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        color: 'white',
        bg: 'blue',
        bgGradient: 'linear(to-r, brand.blue.100 0%, brand.blue.500 100%)',
        padding: '0 1.5rem',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        borderRadius: '50px',
        fontSize: '16px',
        height: '50px',
        lineHeight: '50px',
        fontFamily: 'Lato, sans-serif',
      },
      variants: {
        primary: {
          color: 'white',
          bg: 'blue',
          bgGradient: 'linear(to-r, brand.blue.100 0%, brand.blue.500 100%)',
          padding: '0 1.5rem',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          borderRadius: '50px',
        },
      },
    },
  },
  styles: {
    global: {
      body: {
        fontFamily: 'Lato, sans-serif',
        color: 'white',
        bg: 'brand.100',
      },
    },
  },
})

export default theme
