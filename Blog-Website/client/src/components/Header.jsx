import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { authActions } from "../redux/store";
import toast from "react-hot-toast";

import CloseIcon from "@mui/icons-material/Close";
import { FiAlignRight } from "react-icons/fi";
import axios from "axios";

const Header = () => {
  let isLogin = useSelector((state) => state.isLogin);
  isLogin = isLogin || localStorage.getItem("userId");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      await axios.get(`${backendUrl}/api/v1/user/logout`, {
        withCredentials: true,
      });

      dispatch(authActions.logout());
      localStorage.clear();

      toast.success("Logout Successfully");
      navigate("/login");
    } catch (error) {
      console.error(error);
      toast.error("Logout failed");
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="bg-[#003135] sticky top-0 z-50 shadow-lg backdrop-blur-md bg-opacity-95 border-b border-[#0FA4AF]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="text-white text-3xl font-extrabold tracking-wide drop-shadow-md"
          >
            Bloglio
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-3 ml-6">
            {[
              { label: "Blogs", path: "/blogs", tab: 0 },
              { label: "My Blogs", path: "/my-blogs", tab: 1 },
              { label: "Create Blog", path: isLogin ? "/create-blog" : "/register", tab: 2 },
            ].map((item) => (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === item.tab
                    ? "bg-white text-[#003135] shadow-md border border-[#0FA4AF]/30"
                    : "text-white hover:bg-[#0FA4AF] hover:bg-opacity-80"
                }`}
              >
                <Link to={item.path}>{item.label}</Link>
              </button>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-2 ml-auto">
            {!isLogin ? (
              <>
                <Link
                  to="/login"
                  className="text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0FA4AF] hover:bg-opacity-80 transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0FA4AF] hover:bg-opacity-80 transition"
                >
                  Register
                </Link>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0FA4AF] hover:bg-opacity-80 transition"
              >
                Logout
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle - Only show hamburger if menu is CLOSED */}
          {!mobileMenuOpen && (
            <button
              onClick={toggleMobileMenu}
              className="md:hidden text-white text-3xl focus:outline-none"
            >
             <FiAlignRight />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed top-0 right-0 w-1/2 h-screen
                     bg-white px-4 py-6 space-y-4 shadow-xl overflow-y-auto
                     animate-fadeIn z-40 rounded-l-xl"
        >
          {/* Close Button inside drawer */}
          <div className="flex justify-end">
            <button
              onClick={toggleMobileMenu}
              className="text-[#003135] text-3xl mb-4"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Mobile Nav Links */}
          {[
            { label: "Blogs", path: "/blogs", tab: 0 },
            { label: "My Blogs", path: "/my-blogs", tab: 1 },
            { label: "Create Blog", path: isLogin ? "/create-blog" : "/register", tab: 2 },
          ].map((item) => (
            <Link
              key={item.tab}
              to={item.path}
              onClick={() => {
                setActiveTab(item.tab);
                setMobileMenuOpen(false);
              }}
              className={`block px-3 py-2 rounded-lg font-semibold transition ${
                activeTab === item.tab
                  ? "bg-[#0FA4AF] text-white shadow-md"
                  : "text-[#003135] hover:bg-[#0FA4AF] hover:bg-opacity-70"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Auth in Mobile */}
          {!isLogin ? (
            <>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-[#003135] font-semibold hover:bg-[#0FA4AF] hover:bg-opacity-70 transition"
              >
                Login
              </Link>

              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-[#003135] font-semibold hover:bg-[#0FA4AF] hover:bg-opacity-70 transition"
              >
                Register
              </Link>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-lg text-[#003135] font-semibold hover:bg-[#0FA4AF] hover:bg-opacity-70 transition"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
