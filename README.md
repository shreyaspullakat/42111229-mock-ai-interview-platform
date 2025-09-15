Voice-Assisted Mock Interview Platform

A full-stack web application designed to simulate technical interviews, providing users with AI-generated questions, voice-assisted interactions, and detailed feedback. Users can create custom interviews based on topics, difficulty, and domains, answer questions via text or speech, and receive AI-powered evaluations.
Features

User Authentication: Secure signup and login using JWT for session management.
Interview Creation: Generate custom interviews with AI-powered questions (using Ollama) or fallback mock questions.
Voice Assistance: Text-to-speech for reading questions aloud and speech-to-text for recording answers using Web Speech API.
AI Feedback: Submit answers for analysis, including scores, points covered/missed, and doubt resolution via AI.
Progress Tracking: Real-time progress bar, feedback display, and overall score calculation upon completion.
Data Persistence: Store user data, interviews, and feedbacks in MongoDB.

Tech Stack

Frontend: React.js (with hooks like useState, useEffect, useRef)
Backend: Node.js, Express.js
Database: MongoDB (with Mongoose ORM)
Authentication: JWT, Bcrypt for password hashing
AI Integration: Ollama (local AI for question generation and feedback analysis)
API Requests: Axios
Voice Features: Web Speech API (SpeechSynthesis and SpeechRecognition)
Other Tools: CORS for cross-origin requests, Dotenv for environment variables

Prerequisites

Node.js (v18+)
MongoDB (local or Atlas)
Ollama installed and running locally (with models like tinyllama or llama2 pulled)
Browser with Web Speech API support (e.g., Chrome)

Installation

Clone the Repository:
textgit clone https://github.com/your-username/voice-assisted-mock-interview.git
cd voice-assisted-mock-interview

Backend Setup:

Navigate to backend: cd backend
Install dependencies: npm install
Create .env file:
textMONGO_URI=mongodb://localhost:27017/mockinterviewdb
JWT_SECRET=your-secret-key
PORT=5000

Start server: nodemon index.js


Frontend Setup:

Navigate to frontend: cd ../frontend
Install dependencies: npm install
Start app: npm start (runs on http://localhost:3000)


AI Setup:

Install Ollama: Follow instructions at ollama.ai
Pull a model: ollama pull tinyllama
Ensure Ollama runs on http://localhost:11434



Usage

Sign Up/Login: Create an account via the Auth component.
Create Interview: Input title, topics, difficulty, and domains to generate questions.
Start Interview: Select an interview; questions are spoken aloud.
Answer Questions: Type or record answers using the microphone button.
Submit & Feedback: Get AI feedback with scores and suggestions.
Resolve Doubts: Ask follow-up questions on feedback.

Project Structure
textvoice-assisted-mock-interview/
├── backend/
│   ├── models/           # MongoDB schemas (User.js, Interview.js)
│   ├── routes/           # API routes (interviewRoutes.js, authRoutes.js)
│   ├── services/         # AI helpers (aiService.js)
│   ├── middleware/       # Auth (auth.js)
│   ├── index.js          # Server entry
│   └── .env              # Environment variables
└── frontend/
    ├── src/
    │   ├── components/   # React components (Auth.js, CreateInterview.js)
    │   └── App.js        # Main app logic
    └── public/           # Static assets
