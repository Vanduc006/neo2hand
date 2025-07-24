
import './App.css'
import { Route, Routes } from 'react-router-dom'
import HomeScreen from './page/HomeScreen'
import SupportScreen from './page/SupportScreen'

function App() {
  return (
    <>
      <Routes>
        <Route path='/'>
          <Route index element={<HomeScreen/>}/>
          <Route path='/sp' element={<SupportScreen/>}/>
        </Route>
      </Routes>
    </>
  )
}

export default App
