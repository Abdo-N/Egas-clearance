import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

function getInitialTheme() {
  const stored = localStorage.getItem("theme");

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Follow the OS theme live, but only until the user makes an explicit
  // choice in this browser (tracked separately so a later OS-level change
  // doesn't silently override a deliberate pick).
  useEffect(() => {
    if (localStorage.getItem("themeExplicit") === "1") {
      return undefined;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function handleChange(event) {
      setThemeState(event.matches ? "dark" : "light");
    }

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  function setTheme(nextTheme) {
    localStorage.setItem("themeExplicit", "1");
    setThemeState(nextTheme);
  }

  function toggleTheme() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
