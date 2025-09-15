import mongoose from "mongoose";

const responseSchema = new mongoose.Schema(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true },
    userId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    feedback: { type: String, required: true },
  },
  { timestamps: true }
);

const Response = mongoose.model("Response", responseSchema);

export default Response;
