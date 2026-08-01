import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import SupportModal from "../components/SupportModal";

// الخلفية الكبيرة للشاشة بالكامل (المنصة والغروب)
import mainBackground from "../assets/egas-bg.jpg";

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(user.role === "employee" ? "/employee" : "/reviewer");
    } catch (err) {
      setError(t("login.error") || "اسم المستخدم أو كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        backgroundImage: `url(${mainBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        position: "relative"
      }}
    >
      {/* كارت تسجيل الدخول الأبيض النظيف والمتسنتر بدقة */}
      <div
        style={{
          backgroundColor: "#f4f5f6",
          width: "100%",
          maxWidth: "380px",
          borderRadius: "16px",
          padding: "35px 30px 25px 30px",
          boxShadow: "0 12px 35px rgba(0, 0, 0, 0.4)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 10
        }}
      >
        {/* اللوجو الأخضر الرسمي */}
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <svg width="50" height="50" viewBox="0 0 100 100" fill="#008069">
            <path d="M50 10 L60 35 L85 20 L70 45 L95 50 L70 60 L85 80 L60 70 L50 95 L40 70 L15 80 L30 60 L5 50 L30 45 L15 20 L40 35 Z" />
          </svg>
          <div style={{ fontWeight: "bold", color: "#008069", fontSize: "14px", marginTop: "2px", letterSpacing: "1.5px" }}>
            EGAS
          </div>
        </div>

        {/* العناوين */}
        <h2 style={{ margin: "0 0 5px 0", fontSize: "22px", color: "#111", fontWeight: "600" }}>
          Sign in
        </h2>
        <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#666", textAlign: "center" }}>
          Sign in with your company Active Directory account
        </p>

        {/* الحقول والنموذج */}
        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#333", marginBottom: "5px", fontWeight: "500" }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1.5px solid #008069",
                backgroundColor: "#eaecee",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#333", marginBottom: "5px", fontWeight: "500" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                backgroundColor: "#eaecee",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          {error && (
            <p style={{ color: "#d93025", fontSize: "12px", marginBottom: "15px", textAlign: "center" }}>
              {error}
            </p>
          )}

          {/* زر تسجيل الدخول */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              backgroundColor: "#008069",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "12px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* حسابات الديمو */}
        <div style={{ width: "100%", marginTop: "15px" }}>
          <button
            onClick={() => setShowDemo(!showDemo)}
            type="button"
            style={{
              width: "100%",
              backgroundColor: "#e2e5e8",
              border: "none",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "12px",
              color: "#333",
              textAlign: "left",
              cursor: "pointer"
            }}
          >
            <span>{showDemo ? "▼" : "▶"}</span> Demo accounts (temporary, for testing)
          </button>

          {showDemo && (
            <div style={{ backgroundColor: "#d8dcde", padding: "10px", borderRadius: "6px", marginTop: "5px", fontSize: "11px", color: "#444" }}>
              <p style={{ margin: "2px 0" }}><strong>Employee:</strong> emp / 123</p>
              <p style={{ margin: "2px 0" }}><strong>Reviewer:</strong> rev / 123</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: "20px", fontSize: "11px", color: "#888", textAlign: "center" }}>
          EGAS Employee Clearance
        </div>
      </div>

      <SupportModal />
    </div>
  );
}
