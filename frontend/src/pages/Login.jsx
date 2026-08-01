import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";
import logoUrl from "../assets/egas-logo.png";
import { demoPassword, demoEmployees, demoAdmin, demoReviewers } from "../demoAccounts";

export default function Login() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function fillDemo(account) {
    setUsername(account.username);
    setPassword(demoPassword);
    setError("");
  }

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
      <header className="top-bar">
        <img src={logoUrl} alt="EGAS" />
      </header>

      <div className="login-container">
        <div className="logo-area">
          <img src={logoUrl} alt="EGAS" />
        </div>

        <h1>{t("login.title")}</h1>
        <p className="subtitle">{t("login.subtitle")}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">{t("login.username")}</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t("login.password")}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {t("login.submit")}
          </button>
        </form>

        <details className="login-demo-accounts">
          <summary>{t("login.demoAccounts.summary")}</summary>
          <p className="demo-accounts-hint">{t("login.demoAccounts.fillHint")}</p>

          <div className="demo-accounts-group">
            <h4>{t("login.demoAccounts.employees")}</h4>
            <div className="demo-accounts-list">
              {demoEmployees.map((account) => (
                <button type="button" key={account.username} onClick={() => fillDemo(account)}>
                  <span>{isAr ? account.label_ar : account.label_en}</span>
                  <small>{account.username}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="demo-accounts-group">
            <h4>{t("login.demoAccounts.admin")}</h4>
            <div className="demo-accounts-list">
              <button type="button" onClick={() => fillDemo(demoAdmin)}>
                <span>{isAr ? demoAdmin.label_ar : demoAdmin.label_en}</span>
                <small>{demoAdmin.username}</small>
              </button>
            </div>
          </div>

          <div className="demo-accounts-group">
            <h4>{t("login.demoAccounts.departments")}</h4>
            <div className="demo-accounts-list demo-accounts-list--scroll">
              {demoReviewers.map((account) => (
                <button type="button" key={account.username} onClick={() => fillDemo(account)}>
                  <span>{isAr ? account.label_ar : account.label_en}</span>
                  <small>{account.username}</small>
                </button>
              ))}
            </div>
          </div>

          <p className="demo-accounts-note">
            {t("login.demoAccounts.passwordNote")} <code>{demoPassword}</code>
          </p>
        </details>

        <p className="footer-text">{t("appTitle")}</p>
      </div>

      <LanguageToggle />
    </div>
  );
}
