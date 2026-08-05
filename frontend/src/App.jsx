import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import FileManagementDashboard from "./pages/FileManagementDashboard";
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
  return <Navigate to={user.role === "file_management" ? "/file-management" : "/reviewer"} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/file-management"
            element={
              <RequireRole roles={["file_management"]}>
                <FileManagementDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/reviewer"
            element={
              <RequireRole roles={["reviewer"]}>
                <ReviewerDashboard />
              </RequireRole>
            }
          />
          <Route path="/" element={<Home />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
