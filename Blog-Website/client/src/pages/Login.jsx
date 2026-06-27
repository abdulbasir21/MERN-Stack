import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import axios from "axios";
import { useDispatch } from "react-redux";
import { authActions } from "../redux/store";
import toast from "react-hot-toast";
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  //state
  const [inputs, setInputs] = useState({
    email: "",
    password: "",
  });

  //handle input change
  const handleChange = (e) => {
    setInputs((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  //form handle
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${backendUrl}/api/v1/user/login`, {
        email: inputs.email,
        password: inputs.password,
      },
  {
    withCredentials: true, 
  });
      if (data.success) {
        localStorage.setItem("userId", data?.user._id);
        dispatch(authActions.login());
        toast.success("User login Successfully");
         navigate("/create-blog")
      }
    } catch (error) {
      toast.error(error.response.data.message);
      console.log(error);
    }
  };
  return (
    <>
     <form onSubmit={handleSubmit}>
  <div className="max-w-md mx-auto mt-12 flex flex-col items-center justify-center shadow-lg p-8 rounded-2xl bg-white">
    <h2 className="text-2xl font-semibold uppercase text-center mb-6 text-[#003135]">Login</h2>

    <input
      type="email"
      name="email"
      value={inputs.email}
      onChange={handleChange}
      placeholder="Email"
      required
      className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />

    <input
      type="password"
      name="password"
      value={inputs.password}
      onChange={handleChange}
      placeholder="Password"
      required
      className="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />

    <button
      type="submit"
      className="w-full bg-[#024950] text-white py-2 rounded-lg hover:bg-[#0FA4AF] transition-all duration-200"
    >
      Submit
    </button>

    <button
      type="button"
      onClick={() => navigate("/register")}
      className="mt-4 text-[#003135] hover:underline"
    >
      Not a user? Please Register
    </button>
  </div>
</form>

    </>
  );
};

export default Login;
