import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', counterSchema);

export async function getNextSequence(name: 'inquiry' | 'quotation'): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const formattedSeq = counter.seq.toString().padStart(3, '0');
  return `QP-${formattedSeq}`;
}
