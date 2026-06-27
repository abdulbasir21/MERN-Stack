import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";
import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const Register = () => {
  const navigate = useNavigate();
  //state
  const [inputs, setInputs] = useState({
    name: "",
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

  const { name, email, password } = inputs;

  // 1️⃣ Basic validation
  if (!name || !email || !password) {
    toast.error("Please fill in all fields");
    return;
  }

  // 2️⃣ Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    toast.error("Please enter a valid email address");
    return;
  }

  // 3️⃣ Password length validation
  if (password.length < 6) {
    toast.error("Password must be at least 6 characters");
    return;
  }

  // 4️⃣ Submit if all validations pass
  try {
    const { data } = await axios.post(`${backendUrl}/api/v1/user/register`, {
      username: name,
      email,
      password,
    });

    if (data.success) {
      toast.success("User Registered Successfully");
      navigate("/login");
    }
  } catch (error) {
    console.log(error);
    toast.error("Registration failed");
  }
};

  return (
    <>
     <form onSubmit={handleSubmit}>
  <div className="max-w-md mx-auto mt-12 flex flex-col items-center justify-center shadow-lg p-8 rounded-2xl bg-white">
    <h2 className="text-2xl font-semibold uppercase text-center mb-6 text-[#003135]">Register</h2>

    <input
      type="text"
      name="name"
      value={inputs.name}
      onChange={handleChange}
      placeholder="Name"
      required
      className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />

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
      onClick={() => navigate("/login")}
      className="mt-4 text-[#003135] hover:underline"
    >
      Already Registered? Please Login
    </button>
  </div>
</form>

    </>
  );
};

export default Register;
