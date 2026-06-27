import { FaHeartbeat, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaFacebookF, FaTwitter, FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Left: Logo & Description */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            
            <h2 className="text-xl font-semibold text-white">MedLink</h2>
          </div>
          <p className="text-sm leading-relaxed">
            Your trusted healthcare partner providing quality medical services
            with compassion and expertise.
          </p>
        </div>

        {/* Middle: Contact Info */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Contact Info</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <FaMapMarkerAlt className="text-blue-500" />
              <span>123 Health Street, Medical City</span>
            </li>
            <li className="flex items-center gap-2">
              <FaPhoneAlt className="text-blue-500" />
              <span>(555) 123-4567</span>
            </li>
           
          </ul>
        </div>

        {/* Right: Social Links */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Follow Us</h3>
          <div className="flex gap-4">
            <a href="#" className="text-gray-400 hover:text-white transition">
              <FaFacebookF size={20} />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition">
              <FaTwitter size={20} />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition">
              <FaInstagram size={20} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Line */}
      <div className="border-t border-gray-700 mt-10 pt-6 text-center text-sm text-gray-400">
        © 2025 MedLink. All rights reserved.
      </div>
    </footer>
  );
}
