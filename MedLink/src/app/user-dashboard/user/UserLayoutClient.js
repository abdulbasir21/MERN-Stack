"use client";
import Footer from '../../components/Footer';
import UserNavbar from '../../components/Navbar/UserNavbar';

export default function UserLayoutClient({ children }) {
  const name = typeof window !== "undefined" ? localStorage.getItem("userName") || "User" : "User";
  return (
    <div className="min-h-screen flex flex-col">
      <UserNavbar name={name} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
