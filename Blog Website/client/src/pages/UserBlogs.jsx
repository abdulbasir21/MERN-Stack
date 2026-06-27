import React, { useState, useEffect } from "react";
import axios from "axios";
import BlogCard from "../components/BlogCard";
const UserBlogs = () => {
  const [blogs, setBlogs] = useState([]);

  //get user blogs
  const getUserBlogs = async () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    try {
      const id = localStorage.getItem("userId");
      const { data } = await axios.get(`${backendUrl}/api/v1/blog/user-blog/${id}`, {
  withCredentials: true
});
      if (data?.success) {
        setBlogs(data?.userBlog.blogs);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getUserBlogs();
  }, []);
  console.log(blogs);
  return (
    <div>
      {blogs && blogs.length > 0 ? (
        blogs.map((blog) => (
          <BlogCard
            id={blog._id}
            isUser={true}
            title={blog.title}
            description={blog.description}
            image={blog.image}
            username={blog.user.username}
            time={blog.createdAt}
          />
        ))
      ) : (
         <h1 className="text-3xl md:text-5xl text-white font-bold drop-shadow-lg text-center mt-20">
    You Haven't Created a Blog
  </h1>
      )}
    </div>
  );
};

export default UserBlogs;
