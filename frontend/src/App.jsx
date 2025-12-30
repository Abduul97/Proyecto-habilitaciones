import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Rubros from './pages/Rubros'
import Eventos from './pages/Eventos'
import Habilitados from './pages/Habilitados'
import Chat from './pages/Chat'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="rubros" element={<Rubros />} />
          <Route path="eventos" element={<Eventos />} />
          <Route path="habilitados" element={<Habilitados />} />
          <Route path="chat" element={<Chat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
