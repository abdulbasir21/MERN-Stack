import React, { useState, useEffect } from "react";
import axios from "axios";
import BlogCard from "../components/BlogCard";

const Blogs = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Fetch logged-in user ID from localStorage
  useEffect(() => {
    setCurrentUserId(localStorage.getItem("userId"));
  }, []);

  // Fetch all blogs
  const getAllBlogs = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/v1/blog/all-blog`);
      if (data?.success) {
        setBlogs(data.blogs);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllBlogs();
  }, []);

  return (
    <div>
      {loading && (
        <h1 className="text-center mt-20 text-white text-2xl">
          Loading Blogs........
        </h1>
      )}
      {!loading &&
        blogs.map((blog) => (
          <BlogCard
            key={blog._id}
            id={blog._id}
            isUser={currentUserId && String(currentUserId) === String(blog?.user?._id)}
            title={blog.title}
            description={blog.description}
            image={blog.image}
            username={blog?.user?.username}
            time={blog.createdAt}
          />
        ))}
    </div>
  );
};

export default Blogs;
