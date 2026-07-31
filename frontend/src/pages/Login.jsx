import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(user.role === "employee" ? "/employee" : "/reviewer");
    } catch (err) {
      setError(t("login.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-top">
          <h1>{t("appTitle")}</h1>
          <LanguageToggle />
        </div>
        <h2>{t("login.title")}</h2>
        <p className="subtitle">{t("login.subtitle")}</p>
        <form onSubmit={handleSubmit}>
          <label>
            {t("login.username")}
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label>
            {t("login.password")}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
