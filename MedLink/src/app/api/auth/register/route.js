import User from "@/models/User";
import Doctor from "@/models/Doctor";
import connectDB from "@/lib/db";
import ImageKit from "imagekit";
import { rateLimit } from "@/lib/rateLimit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.NEXT_PUBLIC_URL_ENDPOINT,
});

export async function POST(req) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    if (rl.blocked) {
      return Response.json(
        { error: `Too many registrations. Try again in ${rl.retryAfter}s.` },
        { status: 429 }
      );
    }

    await connectDB();
    const body = await req.json();
    const { role } = body;

    if (role === "user") {
      const { name, gender, email, password } = body;
      const existing = await User.findOne({ email });
      if (existing) return Response.json({ error: "Email already registered" }, { status: 409 });

      const user = new User({ name, gender, email, password, role: "user" });
      await user.save();
      return Response.json({ message: "Patient registered successfully" }, { status: 201 });
    }

    if (role === "doctor") {
      const { name, specialization, experience, description, email, password, imageBase64, phone, licenseNumber, clinicDetails } = body;
      const existing = await Doctor.findOne({ email });
      if (existing) return Response.json({ error: "Email already registered" }, { status: 409 });

      let imageUrl = "";
      if (imageBase64) {
        try {
          const upload = await imagekit.upload({
            file: imageBase64,
            fileName: `${Date.now()}_${name}`,
            folder: "/doctors",
          });
          imageUrl = upload.url;
        } catch (imgErr) {
          console.error("ImageKit upload failed:", imgErr.message);
        }
      }

      const doctor = new Doctor({
        name, specialization, experience, description, email, password,
        role: "doctor",
        image: imageUrl,
        isApproved: false,
        // Extra fields stored in description if model doesn't have them
        ...(phone && { phone }),
        ...(licenseNumber && { licenseNumber }),
        ...(clinicDetails && { clinicDetails }),
      });
      await doctor.save();

      return Response.json({
        message: "Application submitted! Awaiting admin approval. You can login after approval.",
      }, { status: 201 });
    }

    return Response.json({ error: "Invalid role" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
