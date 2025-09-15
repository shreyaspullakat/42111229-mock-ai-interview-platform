// CreateInterview.js
import React, { useState } from "react";

const CreateInterview = ({ 
  onCreate, 
  onCancel, 
  newInterview, 
  setNewInterview 
}) => {
  const [difficulty, setDifficulty] = useState("medium");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted"); // Debug log
    
    const topicsArray = newInterview.topics
      .split(',')
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0);
    
    // Define valid technical domains and their subcategories
    const techDomains = {
      'web': ['html', 'css', 'javascript', 'react', 'angular', 'vue', 'node', 'express', 'next', 'nuxt'],
      'programming': ['python', 'java', 'c++', 'c#', 'c', 'go', 'rust', 'ruby', 'swift', 'kotlin', 'typescript'],
      'databases': ['sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle', 'sqlite', 'dynamodb'],
      'devops': ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd', 'jenkins', 'github actions', 'terraform'],
      'ai_ml': ['machine learning', 'deep learning', 'neural networks', 'nlp', 'computer vision', 'tensorflow', 'pytorch'],
      'networking': ['tcp/ip', 'http', 'https', 'dns', 'load balancing', 'cdns', 'rest', 'graphql', 'grpc'],
      'security': ['authentication', 'authorization', 'jwt', 'oauth', 'encryption', 'ssl/tls', 'xss', 'csrf', 'sql injection'],
      'cloud': ['aws', 'azure', 'google cloud', 'serverless', 'lambda', 'containers', 'microservices'],
      'mobile': ['android', 'ios', 'react native', 'flutter', 'mobile security', 'mobile ui/ux'],
      'testing': ['unit testing', 'integration testing', 'e2e testing', 'jest', 'mocha', 'pytest', 'test driven development'],
      'system design': ['scalability', 'availability', 'load balancing', 'caching', 'sharding', 'distributed systems'],
      'os': ['linux', 'windows', 'macos', 'process management', 'memory management', 'file systems', 'scheduling'],
      'dsa': ['algorithms', 'data structures', 'time complexity', 'space complexity', 'sorting', 'searching', 'graphs', 'trees']
    };

    // Check if any topics are not in our tech domains
    const invalidTopics = [];
    const validTopics = [];

    topicsArray.forEach(topic => {
      const normalizedTopic = topic.toLowerCase();
      let isValid = false;
      
      // Check against all tech domains and their subcategories
      for (const [domain, subcategories] of Object.entries(techDomains)) {
        if (subcategories.some(sub => normalizedTopic.includes(sub)) || 
            normalizedTopic.includes(domain)) {
          isValid = true;
          validTopics.push({
            original: topic,
            domain: domain,
            subcategory: subcategories.find(sub => normalizedTopic.includes(sub)) || domain
          });
          break;
        }
      }
      
      if (!isValid) {
        invalidTopics.push(topic);
      }
    });

    // If we have invalid topics, show suggestions
    if (invalidTopics.length > 0) {
      const suggestions = invalidTopics.map(topic => {
        // Find similar topics
        const similar = [];
        const normalizedTopic = topic.toLowerCase();
        
        for (const [domain, subcategories] of Object.entries(techDomains)) {
          // Check if topic is similar to any domain
          if (domain.includes(normalizedTopic) || normalizedTopic.includes(domain)) {
            similar.push(domain);
          }
          
          // Check if topic is similar to any subcategory
          for (const sub of subcategories) {
            if (sub.includes(normalizedTopic) || normalizedTopic.includes(sub)) {
              similar.push(sub);
            }
          }
          
          // If we have enough suggestions, break early
          if (similar.length >= 3) break;
        }
        
        return {
          topic,
          suggestions: similar.slice(0, 3) // Return top 3 suggestions
        };
      });
      
      // Format error message with suggestions
      const errorMessage = `Some topics couldn't be identified as technical topics.\n\n` +
        suggestions.map(item => 
          `"${item.topic}" - Try: ${item.suggestions.join(', ') || 'No suggestions available'}`
        ).join('\n') +
        '\n\nPlease provide technology-related topics from domains like: ' +
        'Web Development, Programming, Databases, DevOps, AI/ML, Networking, etc.';
      
      alert(errorMessage);
      return;
    }

    if (!newInterview.title.trim() || validTopics.length === 0) {
      alert("Please provide a title and at least one valid topic");
      return;
    }
    
    console.log("Calling onCreate with:", { 
      title: newInterview.title.trim(), 
      topics: validTopics.map(t => ({
        name: t.original,
        domain: t.domain,
        subcategory: t.subcategory
      })),
      difficulty
    });
    
    // Call the parent's submit function with the formatted data
    if (typeof onCreate === 'function') {
      onCreate({
        title: newInterview.title.trim(),
        topics: validTopics.map(t => t.original),
        domains: [...new Set(validTopics.map(t => t.domain))],
        difficulty
      });
    } else {
      console.error("onCreate is not a function");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewInterview(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDifficultyChange = (e) => {
    setDifficulty(e.target.value);
  };

  console.log("Rendering CreateInterview with props:", { 
    newInterview, 
    hasOnCreate: typeof onCreate === 'function' 
  }); // Debug log

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Interview</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Interview Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={newInterview.title || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="E.g., Senior Frontend Developer Interview"
            required
          />
        </div>
        
        {/* Difficulty selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty Level
          </label>
          <div className="grid grid-cols-3 gap-3">
            {['easy', 'medium', 'hard'].map((level) => (
              <label 
                key={level}
                className={`flex items-center justify-center p-3 border rounded-md cursor-pointer transition-colors ${
                  difficulty === level 
                    ? 'bg-blue-100 border-blue-500 text-blue-700' 
                    : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={level}
                  checked={difficulty === level}
                  onChange={() => setDifficulty(level)}
                  className="sr-only" // Hide the actual radio button
                />
                <span className="capitalize">{level}</span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {difficulty === 'easy' && 'Basic concepts and fundamental questions'}
            {difficulty === 'medium' && 'Moderate difficulty with practical scenarios'}
            {difficulty === 'hard' && 'Advanced topics and in-depth analysis'}
          </p>
        </div>
        
        {/* Topics input */}
        <div>
          <label htmlFor="topics" className="block text-sm font-medium text-gray-700 mb-1">
            Topics (comma-separated):
          </label>
          <input
            type="text"
            id="topics"
            name="topics"
            value={newInterview.topics || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., React, Node.js, Algorithms"
            required
          />
        </div>
        
        {/* Submit and cancel buttons */}
        <div className="flex gap-4">
          <button 
            type="submit" 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Create Interview
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateInterview;
