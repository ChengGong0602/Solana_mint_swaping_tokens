import React from 'react'

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import { Graph, Home } from './pages'

import { Layout } from 'components'

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/graph" element={<Graph />} />
        </Route>
      </Routes>
    </Router>
  )
}
