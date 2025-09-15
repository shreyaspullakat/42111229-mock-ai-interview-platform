import axios from 'axios';

const OLLAMA_BASE_URL = 'http://localhost:11434';

class AIService {
  static async generateQuestions(topics, difficulty = 'medium', domains = []) {
    // Fallback questions in case AI service is not available
    const fallbackQuestions = [
      {
        text: `Explain what ${topics[0] || 'this topic'} is and its main use cases.`,
        idealAnswer: `${topics[0] || 'This topic'} is a technology used for...`,
        keyPoints: [
          `Definition of ${topics[0] || 'the topic'}`,
          'Key concepts and features',
          'Common use cases',
          'Benefits and advantages'
        ],
        difficulty,
        category: topics[0] || 'general'
      },
      {
        text: `What are the main differences between ${topics[0] || 'this technology'} and similar technologies?`,
        idealAnswer: `The main differences are...`,
        keyPoints: [
          'Key features comparison',
          'Performance considerations',
          'Use case suitability',
          'Community and ecosystem'
        ],
        difficulty,
        category: topics[0] || 'general'
      },
      {
        text: `How would you implement a basic example of ${topics[0] || 'this technology'}?`,
        idealAnswer: 'Here is a basic implementation...',
        keyPoints: [
          'Setup and installation',
          'Basic code structure',
          'Key functions/methods',
          'Testing and validation'
        ],
        difficulty,
        category: topics[0] || 'general'
      }
    ];

    try {
      console.log('Generating questions with Ollama...');
      const prompt = `Generate 3 interview questions about ${topics.join(', ')} at ${difficulty} difficulty level. ` +
        `${domains.length > 0 ? `Focus on these domains: ${domains.join(', ')}. ` : ''}` +
        `For each question, provide a JSON object with these fields:
        - question: The question text
        - idealAnswer: The ideal answer
        - keyPoints: An array of 3-5 key points that should be covered in the answer
        - category: The main topic category
        
        Return the questions as a JSON array.`;

      console.log('Sending prompt to Ollama:', prompt);
      const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
        model: 'tinyllama',
        prompt: prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.7,
          max_tokens: 2000
        }
      }, {
        timeout: 5000 // 5 second timeout
      }).catch(err => {
        console.error('Error calling Ollama API:', {
          message: err.message,
          code: err.code,
          config: err.config,
          response: err.response?.data
        });
        throw new Error(`Failed to connect to AI service: ${err.message}`);
      });
      
      console.log('Received response from Ollama:', response.data);

      // Parse the response and format it into the expected question structure
      const questions = JSON.parse(response.data.response);
      return questions.map((q, index) => ({
        id: Date.now() + index,
        text: q.question,
        idealAnswer: q.idealAnswer || '',
        keyPoints: q.keyPoints || [],
        difficulty: difficulty,
        category: topics[0] || 'general'
      }));
    } catch (error) {
      console.warn('Error generating questions with Ollama, using fallback questions:', error.message);
      return fallbackQuestions;
    }
  }

  static async analyzeResponse(userAnswer, questionData) {
    const { text: question, idealAnswer = '', keyPoints = [], difficulty = 'medium' } = questionData;
    
    const prompt = `Analyze this interview answer and provide feedback:
    
    Question: ${question}
    Ideal Answer: ${idealAnswer}\n
    User's Answer: ${userAnswer}
    
    Please provide:
    1. A score from 0-100
    2. Detailed feedback
    3. Key points covered
    4. Key points missed
    5. Percentage of key points covered
    
    Format your response as JSON with these fields: {"score": number, "feedback": string, "pointsCovered": string[], "pointsMissed": string[], "coverage": number}`;

    try {
      const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
        model: 'tinyllama',
        prompt: prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.3,
          max_tokens: 2000
        }
      });

      const analysis = JSON.parse(response.data.response);
      return {
        score: analysis.score || 0,
        feedback: analysis.feedback || 'No specific feedback available.',
        pointsCovered: analysis.pointsCovered || [],
        pointsMissed: analysis.pointsMissed || [],
        coverage: analysis.coverage || 0
      };
    } catch (error) {
      console.error('Error analyzing response with Ollama:', error);
      throw new Error('Failed to analyze response with AI');
    }
  }
}

export default AIService;
