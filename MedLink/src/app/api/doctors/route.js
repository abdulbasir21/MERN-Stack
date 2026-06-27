// GET /api/doctors?specialization=&minExp=&maxExp=&search=
import connectDB from "@/lib/db";
import Doctor from "@/models/Doctor";
import { NextResponse } from "next/server";

export async function GET(req) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const specialization = searchParams.get("specialization");
    const minExp = searchParams.get("minExp");
    const maxExp = searchParams.get("maxExp");
    const search = searchParams.get("search");

    const query = { isApproved: true };

    if (specialization) query.specialization = specialization;
    if (minExp || maxExp) {
      query.experience = {};
      if (minExp) query.experience.$gte = Number(minExp);
      if (maxExp) query.experience.$lte = Number(maxExp);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { specialization: { $regex: search, $options: "i" } },
      ];
    }

    const doctors = await Doctor.find(query).select(
      "name specialization image experience description averageRating totalReviews"
    );

    // Get distinct specializations for filter dropdown
    const specializations = await Doctor.distinct("specialization", { isApproved: true });

    return NextResponse.json({ doctors, specializations });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
