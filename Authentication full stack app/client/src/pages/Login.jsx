import React from 'react'
import { assets } from '../assets/assets'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext.jsx'
import axios from 'axios'
import {  toast,ToastContainer } from 'react-toastify';


function Login() {
  const {state,setState}=React.useContext(AppContext); //Login or Sign Up
  const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');


const navigate=useNavigate();

  
const{backendUrl,setIsLoggedin,getUserData}= React.useContext(AppContext);

const sendVerificationOtp = async () => {
  try {
    axios.defaults.withCredentials = true;
    const { data } = await axios.post(backendUrl + '/api/auth/send-verify-otp')
    if (data.success) {
      navigate('/email-verify')
      toast.success(data.message)
    } else {
      toast.error(data.message)
    }
  } catch (error) {
    toast.error(error.message)
  }
}





const onSubmitHandler = async (e) => {
  e.preventDefault();
  axios.defaults.withCredentials = true;

  // Name validation (only for Sign Up)
  if (state === 'Sign Up' && name.trim().length < 3) {
    toast.error("Name must be at least 3 characters long");
    return;
  }

  // Password validation
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
  if (!passwordRegex.test(password)) {
    toast.error("Password must be at least 6 characters, include one uppercase letter and one number");
    return;
  }

  try {
    if (state === 'Sign Up') {
     

      const { data } = await axios.post(
        `${backendUrl}/api/auth/register`,
        { name, email, password }
      );

      if (data.success) {
       
        getUserData();
        toast.success(data.message);
       sendVerificationOtp();
        navigate('/email-verify');
      
      } else {
        toast.error(data.message);
      }
    } else {
      const { data } = await axios.post(
        `${backendUrl}/api/auth/login`,
        { email, password }
      );

      if (data.success) {
        setIsLoggedin(true);
        getUserData();
        navigate('/');
      } else {
        toast.error(data.message);
      }
    }
  } catch (error) {
    toast.error(error.response?.data?.message || "Something went wrong");
  }
};

  return (
    
  <div className="flex items-center justify-center min-h-screen px-6 sm:px-0 bg-gradient-to-tr from-purple-300 via-pink-300 to-yellow-200 relative">

  {/* Logo */}
  <img
    src={assets.logo}
    alt="Logo"
    className="absolute left-5 sm:left-20 top-5 w-10 sm:w-16 cursor-pointer hover:scale-105 transition-transform duration-300"
    onClick={() => navigate('/')}
  />

  {/* Form Container */}
  <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black p-8 sm:p-12 rounded-2xl shadow-2xl w-full sm:w-96 text-gray-100">
    
    {/* Heading */}
    <h2 className="text-3xl sm:text-4xl font-bold text-center mb-2 text-white drop-shadow-md">
      {state === 'Sign Up' ? 'Create Account' : 'Login'}
    </h2>
    <p className="text-center text-sm sm:text-base mb-6 text-gray-300">
      {state === 'Sign Up' ? 'Create your account' : 'Login to your account!'}
    </p>

    {/* Form */}
    <form onSubmit={onSubmitHandler} className="space-y-4">

      {state === 'Sign Up' && (
        <div className="flex items-center gap-3 w-full px-5 py-3 rounded-full bg-gray-700 focus-within:ring-2 focus-within:ring-indigo-400 transition-all duration-300">
          <img src={assets.person_icon} alt="User Icon" className="w-6 h-6"/>
          <input
            type="text"
            placeholder="Full Name"
            required
            className="bg-transparent outline-none w-full placeholder-gray-400 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}

      <div className="flex items-center gap-3 w-full px-5 py-3 rounded-full bg-gray-700 focus-within:ring-2 focus-within:ring-indigo-400 transition-all duration-300">
        <img src={assets.mail_icon} alt="Email Icon" className="w-6 h-6"/>
        <input
          type="email"
          placeholder="Email id"
          required
          className="bg-transparent outline-none w-full placeholder-gray-400 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3 w-full px-5 py-3 rounded-full bg-gray-700 focus-within:ring-2 focus-within:ring-indigo-400 transition-all duration-300">
        <img src={assets.lock_icon} alt="Password Icon" className="w-6 h-6"/>
        <input
          type="password"
          placeholder="Password"
          required
          className="bg-transparent outline-none w-full placeholder-gray-400 text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {state === 'Login' && (
        <p
          className="text-indigo-400 text-right text-sm cursor-pointer hover:text-indigo-300 transition-colors duration-200"
          onClick={() => navigate('/reset-password')}
        >
          Forgot password?
        </p>
      )}

      <button
        className="w-full py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-700 text-white font-semibold shadow-lg hover:scale-105 transition-transform duration-300"
      >
        {state}
      </button>

    </form>

    {/* Toggle Login/Signup */}
    {state === 'Sign Up' ? (
      <p className="text-gray-400 text-center text-xs mt-4">
        Already have an account?{' '}
        <span
          onClick={() => setState('Login')}
          className="text-indigo-400 cursor-pointer underline hover:text-indigo-300 transition-colors duration-200"
        >
          Login here
        </span>
      </p>
    ) : (
      <p className="text-gray-400 text-center text-xs mt-4">
        Don't have an account?{' '}
        <span
          onClick={() => setState('Sign Up')}
          className="text-indigo-400 cursor-pointer underline hover:text-indigo-300 transition-colors duration-200"
        >
          Sign up
        </span>
      </p>
    )}

  </div>
</div>

  )
}

export default Login