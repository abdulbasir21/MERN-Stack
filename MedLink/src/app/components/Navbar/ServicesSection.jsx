"use client";

import { motion } from "framer-motion";
import { FaHeartbeat, FaBrain, FaChild, FaBone } from "react-icons/fa";

const services = [
  {
    id: 1,
    icon: <FaHeartbeat className="text-blue-600 text-4xl mb-4" />,
    title: "Cardiology",
    description: "Heart care and cardiovascular treatments",
  },
  {
    id: 2,
    icon: <FaBrain className="text-blue-600 text-4xl mb-4" />,
    title: "Neurology",
    description: "Brain and nervous system care",
  },
  {
    id: 3,
    icon: <FaChild className="text-blue-600 text-4xl mb-4" />,
    title: "Pediatrics",
    description: "Specialized care for children",
  },
  {
    id: 4,
    icon: <FaBone className="text-blue-600 text-4xl mb-4" />,
    title: "Orthopedics",
    description: "Bone and joint treatments",
  },
];

export default function ServicesSection() {
  return (
    <section className="py-20 bg-gray-50" id="services">
      <div className="max-w-7xl mx-auto px-6 text-center">
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-bold text-gray-900 mb-4"
        >
          Our Services
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-gray-600 mb-12 text-lg"
        >
          Comprehensive healthcare services for all your needs
        </motion.p>

        {/* Services Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.2 },
            },
          }}
        >
          {services.map((service) => (
            <motion.div
              key={service.id}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0 },
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition p-8 flex flex-col items-center text-center"
            >
              {service.icon}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {service.title}
              </h3>
              <p className="text-gray-600 text-sm">{service.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
