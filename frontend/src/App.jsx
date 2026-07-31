import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ReviewerDashboard from "./pages/ReviewerDashboard";

function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "employee" ? "/employee" : "/reviewer"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/employee"
          element={
            <RequireRole roles={["employee"]}>
              <EmployeeDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/reviewer"
          element={
            <RequireRole roles={["reviewer", "admin"]}>
              <ReviewerDashboard />
            </RequireRole>
          }
        />
        <Route path="/" element={<Home />} />
      </Routes>
    </AuthProvider>
  );
}
