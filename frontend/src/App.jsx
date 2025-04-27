import { Routes, Route } from 'react-router-dom';
import ChatbotPage from './pages/ChatbotPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Routes> {/* Use Routes to define your routes */}
        {/* Public route for the authentication page */}
        

        <Route
          path="/" // The main page path
          element={
            
              <ChatbotPage />
           
          }
        />

        {/* Optional: Add a catch-all for 404 */}
        {/* <Route path="*" element={<div>404 Not Found</div>} /> */}
      </Routes>
    </div>
  );
}

export default App;
