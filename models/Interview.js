import mongoose from "mongoose";

// Schema for a single question
const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'],
    required: true 
  },
  idealAnswer: { type: String, required: true },
  keyPoints: [{ type: String }],
  category: { type: String, required: true } // e.g., 'react', 'node', 'javascript'
});

// Schema for an interview
const interviewSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    topics: [{ type: String, required: true }],
    questions: [questionSchema],
    creatorId: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
      default: 'medium'
    }
  },
  { timestamps: true }
);

// Create Interview model
const Interview = mongoose.model("Interview", interviewSchema);

export default Interview;
