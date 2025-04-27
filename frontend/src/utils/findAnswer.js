import  knowledgeBase  from '../data/knowledgeBase';

function findAnswer(userInput) {
  const lowerInput = userInput.toLowerCase();

  // simple matching
  for (const item of knowledgeBase) {
    if (lowerInput.includes(item.question.toLowerCase().split(' ')[0])) {
      return item.answer;
    }
  }

  return "Sorry, I don't know the answer to that yet.";
}

export default findAnswer;