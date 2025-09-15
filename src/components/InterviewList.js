// InterviewList.js
import React from "react";

const InterviewList = ({ interviews, onSelect }) => {
  if (!interviews || interviews.length === 0) return <p>No interviews available.</p>;

  return (
    <ul>
      {interviews.map(
        (interview) =>
          interview && (
            <li key={interview._id} className="mb-2">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={() => onSelect(interview)}
              >
                {interview.title} ({interview.topics?.join(", ")})
              </button>
            </li>
          )
      )}
    </ul>
  );
};

export default InterviewList;
