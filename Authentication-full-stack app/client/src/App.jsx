import React from 'react'
import {Routes,Route} from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/EmailVerify.jsx' 
import EmailVerify from './pages/EmailVerify.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import { ToastContainer, toast } from 'react-toastify';
import { AppContext } from './context/AppContext.jsx';

function App() {
  const{isLoggedin,setIsLoggedin}= React.useContext(AppContext);
  return (
    <div> 
      <ToastContainer />
         <Routes>
      <Route path='/' element={isLoggedin?<Home/>:<Login/>}/>
      <Route path='/login' element={<Login/>}/>
      <Route path='/email-verify' element={<EmailVerify/>}/>
      <Route path='/reset-password' element={<ResetPassword/>}/>

    </Routes>
  </div>

  )
}

export default App