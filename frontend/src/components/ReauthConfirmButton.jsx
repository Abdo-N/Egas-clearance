import { useState } from "react";
import { useTranslation } from "react-i18next";
import PasswordInput from "./PasswordInput";

/**
 * A collapsed-by-default "re-enter your password to confirm" control --
 * shared by every place in the app that undoes something via plain
 * re-authentication rather than a full form (File Management reopening a
 * signature, a reviewer undoing their own just-signed department/item).
 * Collapsed by default so it doesn't clutter an already-signed row until
 * someone actually needs it.
 */
export default function ReauthConfirmButton({ openLabel, confirmLabel, busyLabel, cancelLabel, errorFallback, onConfirm }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onConfirm(password);
      setOpen(false);
      setPassword("");
    } catch (err) {
      setError(err.message || errorFallback);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="secondary-button" onClick={() => setOpen(true)}>
        {openLabel}
      </button>
    );
  }

  return (
    <form className="inline-reauth-form" onSubmit={handleSubmit}>
      <PasswordInput
        wrapperStyle={{ flex: "0 1 180px" }}
        placeholder={t("signature.passwordLabel")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      <button type="submit" className="secondary-button" disabled={submitting || !password}>
        {submitting ? busyLabel : confirmLabel}
      </button>
      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          setOpen(false);
          setError("");
        }}
      >
        {cancelLabel}
      </button>
      {error && <small className="login-error">{error}</small>}
    </form>
  );
}
