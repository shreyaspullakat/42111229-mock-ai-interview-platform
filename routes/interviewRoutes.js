import express from "express";
import axios from "axios";
import Interview from "../models/Interview.js";
import jwt from "jsonwebtoken";
import AIService from "../services/aiService.js";

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET all interviews for the authenticated user
router.get("/", async (req, res) => {
  try {
    const interviews = await Interview.find({ creatorId: req.user.id });
    res.json(interviews);
  } catch (err) {
    console.error("GET / error:", err);
    res.status(500).json({ message: "Failed to fetch interviews", error: err.message });
  }
});

// Generate questions using AI
const generateQuestions = async (topics, difficulty = 'medium', domains = []) => {
  try {
    return await AIService.generateQuestions(topics, difficulty, domains);
  } catch (error) {
    console.error('Error generating questions with AI, falling back to default questions', error);
    // Fallback to basic questions if AI fails
    return [
      {
        id: Date.now(),
        text: `Explain what ${topics[0]} is and its main use cases.`,
        idealAnswer: `${topics[0]} is a technology used for...`,
        keyPoints: [
          `Definition of ${topics[0]}`,
          `Main features of ${topics[0]}`,
          `Common use cases`,
          `Benefits of using ${topics[0]}`
        ],
        difficulty,
        topic: topics[0]
      }
    ];
  }
};

// Helper function to get a related topic
const getRelatedTopic = (currentTopic, allTopics) => {
  const otherTopics = allTopics.filter(t => t !== currentTopic);
  return otherTopics.length > 0 
    ? otherTopics[Math.floor(Math.random() * otherTopics.length)]
    : 'a similar technology';
};

// POST create interview
router.post("/create", authenticateToken, async (req, res) => {
  console.log("=== NEW INTERVIEW CREATION REQUEST ===");
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Auth user:', req.user);
  
  const { title, topics, difficulty = 'medium', domains = [] } = req.body;
  const creatorId = req.user?.id;
  
  console.log('Extracted data:', { title, topics, difficulty, domains, creatorId });

  if (!title || !topics || !Array.isArray(topics) || topics.length === 0) {
    console.error("Validation failed:", { title, topics });
    return res.status(400).json({ 
      message: "Title and topics are required and topics must be a non-empty array" 
    });
  }

  if (!creatorId) {
    console.error("No creator ID in request");
    return res.status(400).json({ message: "User not authenticated properly" });
  }

  try {
    // Use mock questions temporarily
    console.log('Using mock questions instead of AI generation');
    const mockQuestions = [
      {
        text: `What is ${topics[0] || 'this technology'} and what are its main features?`,
        idealAnswer: `${topics[0] || 'This technology'} is a...`,
        keyPoints: [
          'Key feature 1',
          'Key feature 2',
          'Common use cases'
        ],
        category: topics[0] || 'general',
        difficulty: difficulty
      },
      {
        text: `How does ${topics[0] || 'this technology'} compare to similar technologies?`,
        idealAnswer: `${topics[0] || 'This technology'} differs from others by...`,
        keyPoints: [
          'Comparison point 1',
          'Comparison point 2',
          'When to use this technology'
        ],
        category: topics[0] || 'general',
        difficulty: difficulty
      }
    ];
    
    console.log('Mock questions generated:', mockQuestions.length);
    
    const interviewData = {
      title,
      topics,
      difficulty,
      questions: mockQuestions,
      creatorId,
      domains: domains || [],
      createdAt: new Date()
    };
    
    console.log('Creating interview with data:', JSON.stringify(interviewData, null, 2));
    
    console.log('Saving interview to database...');
    try {
      const interview = new Interview(interviewData);
      const savedInterview = await interview.save();
      
      console.log('Interview created successfully:', savedInterview._id);
      
      res.status(201).json({ 
        success: true,
        message: 'Interview created successfully',
        interview: savedInterview
      });
    } catch (saveError) {
      console.error('Error saving interview to database:', {
        name: saveError.name,
        message: saveError.message,
        code: saveError.code,
        keyPattern: saveError.keyPattern,
        keyValue: saveError.keyValue,
        errors: saveError.errors,
        stack: saveError.stack
      });
      throw saveError;
    }
    
  } catch (error) {
    console.error('Error in /create endpoint:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      keyValue: error.keyValue,
      errors: error.errors
    });
    
    res.status(500).json({ 
      success: false,
      message: "Failed to create interview",
      error: error.message 
    });
  }
});

// DELETE interview by ID
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }
    
    // Check if the user is the creator of the interview
    if (interview.creatorId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this interview" });
    }
    
    await Interview.findByIdAndDelete(req.params.id);
    
    // Also delete any responses associated with this interview
    await Response.deleteMany({ interviewId: req.params.id });
    
    res.json({ message: "Interview deleted successfully" });
  } catch (err) {
    console.error("Error deleting interview:", err);
    res.status(500).json({ message: "Error deleting interview", error: err.message });
  }
});

// POST submit answer
router.post("/:id/submit", authenticateToken, async (req, res) => {
  const { answer, questionText } = req.body;
  const userId = req.user?.id;
  const interviewId = req.params.id;

  if (!answer || !questionText || !userId) {
    return res.status(400).json({ message: "Answer, question, and userId are required" });
  }

  try {
    // Find the interview and the specific question
    const interview = await Interview.findOne({ _id: interviewId, creatorId: userId });
    if (!interview) {
      return res.status(404).json({ message: "Interview not found or access denied" });
    }
    
    const questionObj = interview.questions.find(q => q.text === questionText);
    if (!questionObj) {
      return res.status(404).json({ message: "Question not found in this interview" });
    }

    // Analyze the response
    const analysis = await analyzeResponse(answer, {
      idealAnswer: questionObj.idealAnswer,
      keyPoints: questionObj.keyPoints,
      difficulty: interview.difficulty || 'medium'
    });

    // Save the feedback
    interview.feedbacks = interview.feedbacks || [];
    interview.feedbacks.push({
      question: questionText,
      userAnswer: answer,
      feedback: analysis.feedback,
      score: analysis.score,
      timestamp: new Date()
    });

    await interview.save();

    // Return the analysis
    res.json({
      feedback: analysis.feedback,
      score: analysis.score,
      pointsCovered: analysis.pointsCovered,
      pointsMissed: analysis.pointsMissed,
      isComplete: interview.questions.length === interview.feedbacks.length
    });
  } catch (err) {
    console.error("Error in submit route:", err);
    res.status(500).json({ 
      message: "Failed to evaluate answer", 
      error: err.message 
    });
  }
});

// Analyze response using AI
const analyzeResponse = async (userAnswer, questionData) => {
  try {
    return await AIService.analyzeResponse(userAnswer, questionData);
  } catch (error) {
    console.error('Error analyzing response with AI, falling back to basic analysis', error);
    // Fallback to basic analysis if AI fails
    const { idealAnswer = '', keyPoints = [] } = questionData;
    const userAnswerLower = userAnswer.toLowerCase().trim();
    const mentionedPoints = keyPoints.filter(point => 
      userAnswerLower.includes(point.toLowerCase())
    );
    const coverage = keyPoints.length > 0 
      ? (mentionedPoints.length / keyPoints.length) * 100 
      : 0;
    
    return {
      score: Math.round(coverage * 0.7), // Max 70 points for coverage
      feedback: `You've covered ${Math.round(coverage)}% of the key points.`,
      pointsCovered: mentionedPoints,
      pointsMissed: keyPoints.filter(p => !mentionedPoints.includes(p)),
      coverage
    };
  }
};

// Helper function to calculate string similarity (0-1)
function calculateSimilarity(str1, str2) {
  const set1 = new Set(str1.split(/\s+/));
  const set2 = new Set(str2.split(/\s+/));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

function getDifficultyFeedback(difficulty, coverage) {
  const feedback = [];
  
  if (coverage < 30) {
    feedback.push(" Try to address more key aspects of the question.");
  } else if (coverage < 70) {
    feedback.push(" You're on the right track, but there's more to cover.");
  } else {
    feedback.push(" Great coverage of the main points!");
  }
  
  if (difficulty === 'easy') {
    feedback.push("For this basic question, focus on clear, concise explanations.");
  } else if (difficulty === 'medium') {
    feedback.push("For this intermediate question, include relevant examples or use cases.");
  } else {
    feedback.push("For this advanced question, consider discussing trade-offs and edge cases.");
  }
  
  return feedback.join(' ');
}

function getRandomTip(difficulty) {
  const tips = {
    easy: [
      "Start with a clear definition or explanation of the main concept.",
      "Provide a simple example to illustrate your point.",
      "Focus on the basic functionality and purpose."
    ],
    medium: [
      "Include a practical example or use case.",
      "Compare with similar concepts to show understanding.",
      "Explain the 'why' behind the concept, not just the 'what'."
    ],
    hard: [
      "Discuss potential edge cases and how you would handle them.",
      "Explain the underlying principles and trade-offs.",
      "Reference real-world implementations or best practices."
    ]
  };
  
  const tipList = tips[difficulty] || tips.medium;
  return tipList[Math.floor(Math.random() * tipList.length)];
}

// POST endpoint to handle user doubts using Ollama
router.post("/ask-doubt", async (req, res) => {
  try {
    const { question, userAnswer, doubt, context } = req.body;
    
    // Prepare the prompt for the AI
    const prompt = `You are an AI interview assistant. A user was asked: "${question}"
    Their answer was: "${userAnswer}"
    They received this feedback: "${context}"
    
    Now they have a doubt: "${doubt}"
    
    Please provide a helpful and detailed response to their doubt, explaining any concepts they might be confused about.`;

    // Call Ollama API running locally
    const response = await axios.post(
      'http://localhost:11434/api/generate',
      {
        model: 'llama2',  // or any other model you have installed with Ollama
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 1000
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract the AI's response
    const aiResponse = response.data.response.trim();
    
    res.json({ 
      success: true, 
      response: aiResponse 
    });
    
  } catch (error) {
    console.error('Error handling doubt:', error);
    // Fallback response if Ollama is not available
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process your doubt. Please make sure Ollama is running locally.',
      error: error.message,
      fallbackResponse: `I can see you have a doubt about: "${req.body.doubt}". This is a great question! While I can't provide a detailed response right now, I recommend reviewing the feedback provided and researching this topic further. Would you like me to suggest some resources for learning more about this topic?`
    });
  }
});

export default router;
