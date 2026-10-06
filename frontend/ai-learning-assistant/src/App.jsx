import React from 'react'
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import NotFoundPage from './pages/NotFoundPage'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import DocumentDetailPage from './pages/Documents/DocumentDetailPage'
import DocumentListPage from './pages/Documents/DocumentListPage'
import FlashcardListPage from './pages/Flashcards/FlashcardListPage'
import FlashcardPage from './pages/Flashcards/FlashcardPage'
import ProfilePage from './pages/Profile/ProfilePage'
import QuizResultPage from './pages/Quizzes/QuizResultPage'
import QuizTakePage from './pages/Quizzes/QuizTakePage'

const ProtectedRoute = ({ isAuthenticated }) => (
  isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
)

const App = () => {
  const isAuthenticated = true
  const loading = false

  if (loading) {
    return <div className='flex items-center h-screen'>
      <p>Loading...</p>
    </div>
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentListPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/flashcards" element={<FlashcardListPage />} />
          <Route path="/documents/:id/flashcards" element={<FlashcardPage />} />
          <Route path="/quizzes/:quizId" element={<QuizTakePage />} />
          <Route path="/quizzes/:quizId/results" element={<QuizResultPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>   
  )

}



export default App
