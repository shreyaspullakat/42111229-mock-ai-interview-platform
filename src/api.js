// frontend/src/api.js

export async function getQuestions() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const res = await fetch("http://localhost:5000/api/interview/questions", {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      // Token might be expired, clear it and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
      return;
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to fetch questions");
    }

    return await res.json();
  } catch (error) {
    console.error("❌ API error:", error);
    throw error;
  }
}
