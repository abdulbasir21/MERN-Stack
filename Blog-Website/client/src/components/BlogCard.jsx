import React from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import ModeEditIcon from "@mui/icons-material/ModeEdit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function BlogCard({
  title,
  description,
  image,
  username,
  time,
  id,
  isUser,
}) {
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const handleEdit = () => {
    navigate(`/blog-details/${id}`);
  };

  const handleDelete = async () => {
    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/v1/blog/delete-blog/${id}`,
        { withCredentials: true }
      );

      if (data?.success) {
        toast.success("Blog Deleted");
        setTimeout(() => {
          // Refresh page or redirect
          if (location.pathname === "/my-blogs") navigate("/blogs");
          else if (location.pathname === "/blogs") navigate(0);
          else navigate("/blogs");
        }, 500);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete blog");
    }
  };

  return (
    <div  className="w-full sm:w-3/5 mx-auto mt-6 p-4 shadow-md hover:shadow-xl rounded-lg bg-white transition-shadow duration-300">
      {/* Edit/Delete Buttons */}
      {isUser && (
        <div className="flex justify-end space-x-2 mb-2">
          <button
            onClick={handleEdit}
            className="text-blue-500 hover:text-blue-700 transition-colors"
            title="Edit Blog"
          >
            <ModeEditIcon />
          </button>
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 transition-colors"
            title="Delete Blog"
          >
            <DeleteIcon />
          </button>
        </div>
      )}

      {/* User Info */}
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold mr-3">
          {username ? username[0].toUpperCase() : "U"}
        </div>
        <div>
          <h3 className="font-semibold">{username || "Unknown User"}</h3>
         
        </div>
      </div>

      {/* Blog Image */}
      {image && (
        <img
          src={image}
          alt={title || "Blog Image"}
          className="w-full h-48 object-cover rounded-md mb-4"
        />
      )}

      {/* Blog Content */}
      <div>
        <h4 className="font-semibold text-lg mb-1">Title: {title || "No Title"}</h4>
        <p className="text-gray-600">
          Description: {description || "No Description"}
        </p>
      </div>
    </div>
  );
}
