
import './App.css'
import { Route, Routes } from 'react-router-dom'
import HomeScreen from './page/HomeScreen'
import SupportScreen from './page/SupportScreen'
import ProductManagement from './page/ProductManagement'

function App() {
  return (
    <>
      <Routes>
        <Route path='/'>
          <Route index element={<HomeScreen/>}/>
          <Route path='/sp' element={<SupportScreen/>}/>
          <Route path='/quanli' element={<ProductManagement/>}/>
        </Route>
      </Routes>
    </>
  )
}

export default App
