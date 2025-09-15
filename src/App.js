import React, { useState, useEffect, useRef } from "react";
import Auth from "./components/Auth";
import CreateInterview from "./components/CreateInterview";

const App = () => {
  const [user, setUser] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [currentInterview, setCurrentInterview] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [creatingInterview, setCreatingInterview] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [newInterview, setNewInterview] = useState({ title: "", topics: "" });
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentDoubt, setCurrentDoubt] = useState("");
  const [doubtResponse, setDoubtResponse] = useState("");
  const [isAskingDoubt, setIsAskingDoubt] = useState(false);
  const recognitionRef = useRef(null);

  // Check for existing token on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Here you would typically validate the token with the server
      // For now, we'll just set a dummy user
      setUser({ email: 'user@example.com' });
      fetchInterviews();
    }
  }, []);

  // Fetch interviews with auth token
  const fetchInterviews = async () => {
    const token = localStorage.getItem('token');
    console.log('Current token from localStorage:', token);
    
    if (!token) {
      console.error('No token found in localStorage');
      setUser(null);
      return;
    }
    
    try {
      console.log('Making request to /api/interviews with token:', token.substring(0, 20) + '...');
      
      const response = await fetch('http://localhost:5000/api/interviews', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        responseData = {};
      }
      
      if (response.status === 401) {
        console.log('Token expired or invalid');
        localStorage.removeItem('token');
        setUser(null);
        throw new Error('Session expired. Please log in again.');
      }
      
      if (response.status === 403) {
        console.error('Access forbidden. Possible issues:', {
          tokenValid: !!token,
          tokenLength: token.length,
          responseStatus: response.status,
          responseData
        });
        throw new Error('You do not have permission to access this resource.');
      }
      
      if (!response.ok) {
        console.error('Request failed with status:', response.status);
        throw new Error(responseData.message || `Request failed with status ${response.status}`);
      }
      
      console.log('Successfully fetched interviews:', responseData);
      setInterviews(Array.isArray(responseData) ? responseData : []);
      
    } catch (err) {
      console.error('Error in fetchInterviews:', {
        error: err,
        message: err.message,
        stack: err.stack
      });
      
      if (err.message.includes('401') || err.message.includes('403')) {
        localStorage.removeItem('token');
        setUser(null);
      }
      
      // Show error to user
      alert(`Error: ${err.message}`);
    }
  };

  // Handle successful login
  const handleLogin = (userData) => {
    console.log('Login successful, user data:', userData);
    
    // Make sure we have the token
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found after login');
      return;
    }
    
    // Create user object with correct ID field
    const userWithCorrectId = {
      ...userData,
      id: userData._id || userData.id,
      token: token // Store the token in user state for debugging
    };
    
    console.log('Setting user:', userWithCorrectId);
    setUser(userWithCorrectId);
    
    // Fetch interviews after a short delay to ensure state is updated
    setTimeout(() => {
      console.log('Fetching interviews after login...');
      fetchInterviews();
    }, 100);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setInterviews([]);
    setCurrentInterview(null);
  };

  // Reset interview state
  const resetInterview = () => {
    setCurrentInterview(null);
    setCurrentIndex(0);
    setUserAnswer("");
    setFeedbacks([]);
    setInterviewCompleted(false);
  };

  // Select an interview
  const selectInterview = (interview) => {
    if (!interview || !interview.questions || interview.questions.length === 0) {
      alert("This interview has no questions.");
      return;
    }
    setCurrentInterview(interview);
    setCurrentIndex(0);
    setFeedbacks([]);
    setInterviewCompleted(false);
    speak(interview.questions[0].text);
  };

  // Speech recognition setup
  const initRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setUserAnswer(transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    return recognition;
  };

  const startListening = () => {
    if (!recognitionRef.current) recognitionRef.current = initRecognition();
    if (recognitionRef.current && !listening) {
      setListening(true);
      recognitionRef.current.start();
    }
  };

  const speak = (text) => {
    if (!text) return;
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    synth.speak(utter);
  };

  // Submit an answer
  const submitAnswer = async () => {
    if (!currentInterview || !currentInterview.questions[currentIndex]) return;
    
    try {
      const response = await fetch(
        `http://localhost:5000/api/interviews/${currentInterview._id}/submit`,
        {
          method: "POST",
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            questionText: currentInterview.questions[currentIndex].text,
            answer: userAnswer,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to submit answer');

      const data = await response.json();
      
      const newFeedback = {
        question: currentInterview.questions[currentIndex].text,
        userAnswer,
        feedback: data.feedback || "No feedback",
        score: data.score || 0,
        pointsCovered: data.pointsCovered || [],
        pointsMissed: data.pointsMissed || [],
        doubts: []
      };

      setFeedbacks(prev => {
        const updated = [...prev];
        updated[currentIndex] = newFeedback;
        return updated;
      });

      setShowFeedback(true);
      
    } catch (err) {
      console.error('Error submitting answer:', err);
      if (err.message.includes('401')) {
        localStorage.removeItem('token');
        setUser(null);
      } else {
        alert('Failed to submit answer. Please try again.');
      }
    }
  };

  const moveToNextQuestion = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < currentInterview.questions.length) {
      setCurrentIndex(nextIndex);
      setUserAnswer("");
      setShowFeedback(false);
      setCurrentDoubt("");
      setDoubtResponse("");
      speak(currentInterview.questions[nextIndex].text);
    } else {
      completeInterview();
    }
  };

  const completeInterview = () => {
    setInterviewCompleted(true);
    const avgScore = Math.round(
      feedbacks.reduce((sum, f) => sum + (f?.score || 0), 0) / feedbacks.length
    );
    
    const completionMessage = `✅ Interview completed! \n\n` +
      `Your overall score: ${avgScore}/100\n`;
    
    speak("Interview completed! Your results are ready.");
    alert(completionMessage);
  };

  const askDoubt = async () => {
    if (!currentDoubt.trim()) return;
    
    try {
      setIsAskingDoubt(true);
      const response = await fetch('http://localhost:5000/api/ask-doubt', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: currentInterview.questions[currentIndex].text,
          userAnswer,
          doubt: currentDoubt,
          context: feedbacks[currentIndex]?.feedback || ""
        })
      });

      if (!response.ok) throw new Error('Failed to get doubt response');
      
      const data = await response.json();
      setDoubtResponse(data.response);
      
      // Update feedbacks with the doubt and response
      setFeedbacks(prev => {
        const updated = [...prev];
        updated[currentIndex] = {
          ...updated[currentIndex],
          doubts: [
            ...(updated[currentIndex]?.doubts || []),
            { question: currentDoubt, answer: data.response }
          ]
        };
        return updated;
      });
      
    } catch (err) {
      console.error('Error asking doubt:', err);
      alert('Failed to get response to your doubt. Please try again.');
    } finally {
      setIsAskingDoubt(false);
    }
  };

  // Create a new interview
  const submitNewInterview = () => {
    const topicsArray = newInterview.topics
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!newInterview.title || topicsArray.length === 0) {
      alert("Provide a title and at least one topic.");
      return;
    }

    fetch('http://localhost:5000/api/interviews/create', {
      method: "POST",
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        title: newInterview.title,
        topics: topicsArray,
        difficulty: 'medium', // Add default difficulty
        domains: [] // Add empty domains array as expected by server
      })
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to create interview');
        }
        return res.json();
      })
      .then((data) => {
        if (data?.success && data.interview) {
          setInterviews((prev) => [data.interview, ...prev]);
          setCreatingInterview(false);
          setNewInterview({ title: "", topics: "" });
        } else {
          throw new Error(data?.message || "Failed to create interview");
        }
      })
      .catch((err) => {
        console.error('Error creating interview:', err);
        // If unauthorized, redirect to login
        if (err.message.includes('401')) {
          localStorage.removeItem('token');
          setUser(null);
        }
      });
  };

  // Add this function to handle interview deletion
  const deleteInterview = async (interviewId, e) => {
    e.stopPropagation(); // Prevent triggering the interview selection
    
    if (window.confirm('Are you sure you want to delete this interview?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/interviews/${interviewId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete interview');
        }

        // Refresh the interviews list
        fetchInterviews();
        alert('Interview deleted successfully');
      } catch (err) {
        console.error('Error deleting interview:', err);
        alert('Failed to delete interview');
      }
    }
  };

  // Update the interview list item rendering to include delete button
  const renderInterviewItem = (interview) => {
    const isCreator = interview.creatorId === user?.email;
    
    return (
      <div 
        key={interview._id} 
        className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer relative group"
        onClick={() => selectInterview(interview)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{interview.title}</h3>
            <p className="text-sm text-gray-500">
              {interview.questions?.length || 0} questions • 
              <span className="capitalize"> {interview.difficulty || 'medium'}</span>
            </p>
          </div>
          {isCreator && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteInterview(interview._id, e);
              }}
              className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity p-1"
              title="Delete interview"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  // Update the feedback rendering to show only current question's feedback
  const renderCurrentFeedback = () => {
    const currentFeedback = feedbacks[currentIndex];
    if (!currentFeedback) return null;

    const score = typeof currentFeedback.score === 'number' ? currentFeedback.score : 0;
    const feedbackLines = (currentFeedback.feedback || '').split('\n').filter(line => line.trim());

    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="font-semibold text-gray-800">Your Score:</span>
          </div>
          <div className="flex items-center">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              score >= 80 ? 'bg-green-100 text-green-800' :
              score >= 60 ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {Math.round(score)}%
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div 
            className={`h-2.5 rounded-full ${
              score >= 80 ? 'bg-green-500' :
              score >= 60 ? 'bg-blue-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${Math.max(5, Math.round(score))}%` }}
          ></div>
        </div>

        <div className="mb-4 p-3 bg-white rounded border border-gray-200">
          <p className="font-medium text-gray-700 mb-1">Your Answer:</p>
          <p className="text-gray-800">{currentFeedback.userAnswer || "No answer provided"}</p>
        </div>

        {feedbackLines.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded">
            <p className="font-medium text-blue-700 mb-1">Feedback:</p>
            {feedbackLines.map((line, i) => (
              <p key={i} className="text-blue-800 whitespace-pre-line">{line}</p>
            ))}
          </div>
        )}

        {currentFeedback.pointsCovered && currentFeedback.pointsCovered.length > 0 && (
          <div className="mb-3">
            <span className="text-sm font-medium text-green-700">✅ Points Covered:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {currentFeedback.pointsCovered.map((point, i) => (
                <span key={i} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  {point}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {currentFeedback.pointsMissed && currentFeedback.pointsMissed.length > 0 && (
          <div>
            <span className="text-sm font-medium text-red-700">❌ Areas to Improve:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {currentFeedback.pointsMissed.map((point, i) => (
                <span key={i} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                  {point}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {!user ? (
          <Auth onLogin={handleLogin} />
        ) : creatingInterview ? (
          <CreateInterview
            newInterview={newInterview}
            setNewInterview={setNewInterview}
            onCreate={submitNewInterview}
            onCancel={() => setCreatingInterview(false)}
          />
        ) : !currentInterview ? (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Mock AI Interviews</h1>
              <div className="flex gap-4">
                <button
                  onClick={() => setCreatingInterview(true)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                >
                  Create New Interview
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {interviews.map(interview => renderInterviewItem(interview))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">{currentInterview.title}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={resetInterview}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Back to Home
                  </button>
                  {interviewCompleted && (
                    <button
                      onClick={resetInterview}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Finish Interview
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${((currentIndex + 1) / currentInterview.questions.length) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  Question {currentIndex + 1} of {currentInterview.questions.length}
                </span>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg mb-6">
                <p className="text-lg font-medium text-gray-800 mb-2">Question:</p>
                <p className="text-gray-700">{currentInterview.questions[currentIndex]?.text}</p>
              </div>

              <div className="mb-6">
                <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Answer:
                </label>
                <textarea
                  id="answer"
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows="4"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type or record your answer here..."
                  disabled={showFeedback}
                />
              </div>

              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={startListening}
                  disabled={listening || showFeedback}
                  className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    listening 
                      ? 'bg-red-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {listening ? (
                    <>
                      <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                      Listening...
                    </>
                  ) : (
                    '🎤 Record Answer'
                  )}
                </button>
                
                <button
                  onClick={submitAnswer}
                  disabled={!userAnswer.trim() || showFeedback}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Submit Answer
                </button>
              </div>

              {showFeedback && feedbacks[currentIndex] && (
                <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-800">
                      Feedback for Question {currentIndex + 1}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        feedbacks[currentIndex].score >= 80 ? 'bg-green-100 text-green-800' :
                        feedbacks[currentIndex].score >= 60 ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        Score: {Math.round(feedbacks[currentIndex].score)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-700 mb-2">Your Answer</h4>
                        <p className="text-gray-800 whitespace-pre-line">
                          {feedbacks[currentIndex].userAnswer || "No answer provided"}
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-700 mb-2">AI Feedback</h4>
                        <p className="text-gray-800 whitespace-pre-line">
                          {feedbacks[currentIndex].feedback}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {feedbacks[currentIndex].pointsCovered?.length > 0 && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                          <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                            <span className="text-green-500">✓</span> Points Covered
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-green-800">
                            {feedbacks[currentIndex].pointsCovered.map((point, i) => (
                              <li key={i} className="text-sm">{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {feedbacks[currentIndex].pointsMissed?.length > 0 && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                          <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                            <span className="text-red-500">✗</span> Areas to Improve
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-red-800">
                            {feedbacks[currentIndex].pointsMissed.map((point, i) => (
                              <li key={i} className="text-sm">{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    <h4 className="font-medium text-gray-700 mb-3">Have a doubt about the feedback?</h4>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={currentDoubt}
                        onChange={(e) => setCurrentDoubt(e.target.value)}
                        placeholder="Ask your question here..."
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        onKeyPress={(e) => e.key === 'Enter' && askDoubt()}
                      />
                      <button
                        onClick={askDoubt}
                        disabled={!currentDoubt.trim() || isAskingDoubt}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isAskingDoubt ? 'Asking...' : 'Ask'}
                      </button>
                    </div>
                    
                    {doubtResponse && (
                      <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r">
                        <p className="text-blue-800 whitespace-pre-line">{doubtResponse}</p>
                      </div>
                    )}

                    {(feedbacks[currentIndex]?.doubts || []).length > 0 && (
                      <div className="mt-6 space-y-4">
                        <h5 className="font-medium text-gray-600">Previous Doubts:</h5>
                        {feedbacks[currentIndex].doubts.map((doubt, i) => (
                          <div key={i} className="bg-white p-4 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-700 font-medium">Q: {doubt.question}</p>
                            <p className="mt-2 text-sm text-gray-600">A: {doubt.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={moveToNextQuestion}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      {currentIndex < currentInterview.questions.length - 1 ? 'Next Question' : 'Finish Interview'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
