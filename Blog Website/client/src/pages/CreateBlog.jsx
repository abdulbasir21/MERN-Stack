import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Box, Button, InputLabel, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
const CreateBlog = () => {

  const id = localStorage.getItem("userId");
  const navigate = useNavigate();
  const [inputs, setInputs] = useState({
    title: "",
    description: "",
    image: "",
  });
  // input change
  const handleChange = (e) => {
    setInputs((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };
  //form
  const handleSubmit = async (e) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    e.preventDefault();
  
    try {
      const { data } = await axios.post(`${backendUrl}/api/v1/blog/create-blog`, {
        title: inputs.title,
        description: inputs.description,
        image: inputs.image,
       
      },
      {
        withCredentials: true, 
      });
      if (data?.success) {
        toast.success("Blog Created");
        navigate("/my-blogs");
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <>
     <form
  onSubmit={handleSubmit}
  className="flex justify-center items-start mt-12 px-4"
>
  <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 sm:p-10 flex flex-col">
    {/* Form Title */}
    <h2 className="text-4xl font-extrabold text-[#003135] text-center mb-8">
      Create a Post
    </h2>

    {/* Title Input */}
    <label
      className="block text-lg font-semibold text-gray-700 mb-2"
      htmlFor="title"
    >
      Title
    </label>
    <input
      type="text"
      id="title"
      name="title"
      value={inputs.title}
      onChange={handleChange}
      required
      placeholder="Enter post title"
      className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
    />

    {/* Description Input */}
    <label
      className="block text-lg font-semibold text-gray-700 mb-2"
      htmlFor="description"
    >
      Description
    </label>
    <textarea
      id="description"
      name="description"
      value={inputs.description}
      onChange={handleChange}
      required
      rows={5}
      placeholder="Enter post description"
      className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition resize-none"
    ></textarea>

    {/* Image URL Input */}
    <label
      className="block text-lg font-semibold text-gray-700 mb-2"
      htmlFor="image"
    >
      Image URL
    </label>
    <input
      type="text"
      id="image"
      name="image"
      value={inputs.image}
      onChange={handleChange}
      required
      placeholder="Enter image URL"
      className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-8 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
    />

    {/* Submit Button */}
    <button
      type="submit"
      className="w-full bg-[#024950] text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transform transition-all duration-300"
    >
      SUBMIT
    </button>
  </div>
</form>

    </>
  );
};

export default CreateBlog;
