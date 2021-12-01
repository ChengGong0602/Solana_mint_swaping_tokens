import React from 'react'

import {
  Table as ChakraTable,
  TableCaption,
  Th,
  Tr,
  Tbody,
  Thead,
} from '@chakra-ui/react'

type Row = string[]

type TableRowProps = {
  row: Row,
  color?: string
}

type TableProps = {
  data: Array<Row>,
  headers: Row
}

export function Table({ data, headers }: TableProps) {
  return (
    <ChakraTable
      colorScheme="whiteAlpha"
      variant="simple"
      size="lg"
      width="100%"
      backgroundColor="brand.200"
      color="white"
      borderRadius="md"
      boxShadow="brand.100"
    >
      <Thead>
        <TableRow color="white" row={headers}></TableRow>
      </Thead>
      <Tbody>
        {data.map((row, index) => (
          <TableRow color="gray.300" key={`${row}_${index}`} row={row} />
        ))}
      </Tbody>
    </ChakraTable>
  )
}

function TableRow({ row, color }: TableRowProps) {
  return (
    <Tr>
      {row.map((field, index) => (
        <Th key={`${field}_${index}`} color={color}>
          {field}
        </Th>
      ))}
    </Tr>
  )
}
