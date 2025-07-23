// import './App.css'
import { AuthProvider } from './AuthContext'
import { Routes, Route } from 'react-router'
import ProtectedRoute from './ProtectedRoute'
import Dashboard from './pages/Dashboard'
import User from './pages/User'
import Expense from './pages/Expense'
import Manager from './pages/Manager'
import ShowExpense from './pages/ShowExpense'
import Login from './pages/Login'
import ManagerUsers from './pages/ManagerUsers'

function App() {

  return (
    <>
      <AuthProvider>

        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/" element={<ShowExpense />} />
            <Route path="users" element={<User />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
            <Route index path="/create-expense" element={<Expense />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
            <Route index  path="/manager" element={<Manager />} />
            <Route path="/manage-users" element={<ManagerUsers />} />
          </Route>

          <Route path="/login" element={<Login />} />
        </Routes>
      </AuthProvider>
    </>
  )
}

export default App
