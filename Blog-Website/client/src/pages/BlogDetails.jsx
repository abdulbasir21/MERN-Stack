import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, InputLabel, TextField, Typography } from "@mui/material";
const BlogDetails = () => {
  const [blog, setBlog] = useState({});
  const id = useParams().id;
  const navigate = useNavigate();
  const [inputs, setInputs] = useState({});
  // get blog details
  const getBlogDetail = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const { data } = await axios.get(`${backendUrl}/api/v1/blog/get-blog/${id}`, {
  withCredentials: true
});
      if (data?.success) {
        setBlog(data?.blog);
        setInputs({
          title: data?.blog.title,
          description: data?.blog.description,
          image: data?.blog.image,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getBlogDetail();
  }, [id]);

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
   axios.defaults.withCredentials = true;
    e.preventDefault();
    try {
      const { data } = await axios.put(`${backendUrl}/api/v1/blog/update-blog/${id}`, {
        title: inputs.title,
        description: inputs.description,
        image: inputs.image,
        user: id,
      });
      if (data?.success) {
        toast.success("Blog Updated");
        navigate("/my-blogs");
      }
    } catch (error) {
      console.log(error);
    }
  };
  console.log(blog);
  return (
    <v>
      <form
  onSubmit={handleSubmit}
  className="flex justify-center items-start mt-12 px-4"
>
  <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 sm:p-10 flex flex-col">
    {/* Form Title */}
    <h2 className="text-4xl font-extrabold text-[#003135] text-center mb-8">
      Update a Post
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
      Update Post
    </button>
  </div>
</form>
    </v>
  );
};

export default BlogDetails;
