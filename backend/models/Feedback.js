import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  complaint_id: String,
  rating: Number,
  comment: String,
  user: String,
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model("Feedback", feedbackSchema);