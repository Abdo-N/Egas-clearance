import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import SupportModal from "../components/SupportModal";
import LanguageToggle from "../components/LanguageToggle";
import logoUrl from "../assets/egas-logo.png";
import { demoEmployees, demoAdmin, demoReviewers, demoPassword } from "../demoAccounts";

// الخلفية الكبيرة للشاشة بالكامل (المنصة والغروب)
import mainBackground from "../assets/egas-bg.jpg";

const demoAccountButtonStyle = {
  display: "block",
  width: "100%",
  textAlign: "inherit",
  background: "none",
  border: "none",
  padding: "4px 0",
  margin: 0,
  fontSize: "11px",
  color: "#008069",
  cursor: "pointer",
};

export default function Login() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  function fillDemo(account) {
    setUsername(account.username);
    setPassword(demoPassword);
  }

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
        {/* اللوجو الرسمي */}
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <img src={logoUrl} alt="EGAS" style={{ width: "64px", height: "64px", objectFit: "contain" }} />
        </div>

        {/* العناوين */}
        <h2 style={{ margin: "0 0 5px 0", fontSize: "22px", color: "#111", fontWeight: "600" }}>
          {t("login.title")}
        </h2>
        <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#666", textAlign: "center" }}>
          {t("login.subtitle")}
        </p>

        {/* الحقول والنموذج */}
        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#333", marginBottom: "5px", fontWeight: "500" }}>
              {t("login.username")}
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
              {t("login.password")}
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
            {loading ? t("employee.submitting") : t("login.submit")}
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
              textAlign: isAr ? "right" : "left",
              cursor: "pointer"
            }}
          >
            <span>{showDemo ? "▼" : "▶"}</span> {t("login.demoAccounts.summary")}
          </button>

          {showDemo && (
            <div style={{ backgroundColor: "#d8dcde", padding: "10px", borderRadius: "6px", marginTop: "5px", fontSize: "11px", color: "#444" }}>
              <strong>{t("login.demoAccounts.employees")}</strong>
              {demoEmployees.map((acc) => (
                <button
                  type="button"
                  key={acc.username}
                  onClick={() => fillDemo(acc)}
                  style={demoAccountButtonStyle}
                >
                  {isAr ? acc.label_ar : acc.label_en} <code>({acc.username})</code>
                </button>
              ))}

              <strong style={{ display: "block", marginTop: "8px" }}>{t("login.demoAccounts.admin")}</strong>
              <button type="button" onClick={() => fillDemo(demoAdmin)} style={demoAccountButtonStyle}>
                {isAr ? demoAdmin.label_ar : demoAdmin.label_en} <code>({demoAdmin.username})</code>
              </button>

              <strong style={{ display: "block", marginTop: "8px" }}>{t("login.demoAccounts.departments")}</strong>
              {demoReviewers.map((acc) => (
                <button
                  type="button"
                  key={acc.username}
                  onClick={() => fillDemo(acc)}
                  style={demoAccountButtonStyle}
                >
                  {isAr ? acc.label_ar : acc.label_en} <code>({acc.username})</code>
                </button>
              ))}

              <p style={{ margin: "8px 0 0" }}>
                {t("login.demoAccounts.passwordNote")} <code>{demoPassword}</code>
              </p>
              <p style={{ margin: "2px 0 0", fontStyle: "italic" }}>{t("login.demoAccounts.fillHint")}</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: "20px", fontSize: "11px", color: "#888", textAlign: "center" }}>
          {t("appTitle")}
        </div>
      </div>

      <SupportModal />
      <LanguageToggle />
    </div>
  );
}
