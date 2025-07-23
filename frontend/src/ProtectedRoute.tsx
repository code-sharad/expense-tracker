import { Navigate, Outlet } from "react-router";
import { useAuth } from "./hook/useAuth";
import Navbar from "./components/Navbar";


export default function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (currentUser == null || (allowedRoles && !allowedRoles.includes(currentUser.role))) {
    return <div>Permission denied</div>;
  }

  return <div>
    <Navbar />
    <div className=" mx-auto px-4 py-6 bg-stone-50">
      <Outlet />
    </div>
  </div>
}