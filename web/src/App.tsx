import { useEffect, useState } from "react";
import HomeScreen from "./screens/HomeScreen";
import NoteScreen from "./screens/NoteScreen";
import StatsScreen from "./screens/StatsScreen";
import LoginScreen from "./screens/LoginScreen";
import AdminScreen from "./screens/AdminScreen";
import VaccineScreen from "./screens/VaccineScreen";
import DiaryScreen from "./screens/DiaryScreen";
import { verifyToken } from "./api";
import { clearSession, loadSession, saveSession } from "./session";
import type { Session } from "./types";

export type Screen = "HOME" | "NOTE" | "STATS" | "ADMIN" | "VACCINE" | "DIARY";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [screen, setScreen] = useState<Screen>("HOME");

  useEffect(() => {
    const stored = loadSession();
    if (!stored) {
      setCheckingSession(false);
      return;
    }
    verifyToken(stored.token)
      .then((fresh) => {
        saveSession(fresh);
        setSession(fresh);
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => setCheckingSession(false));
  }, []);

  function handleLogin(newSession: Session) {
    saveSession(newSession);
    setSession(newSession);
    setScreen("HOME");
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setScreen("HOME");
  }

  function handleSessionUpdate(newSession: Session) {
    saveSession(newSession);
    setSession(newSession);
  }

  if (checkingSession) {
    return <div className="app" />;
  }

  return (
    <div className="app">
      {!session ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <>
          {screen === "HOME" && (
            <HomeScreen
              session={session}
              onNavigate={setScreen}
              onLogout={handleLogout}
              onSessionUpdate={handleSessionUpdate}
            />
          )}
          {screen === "NOTE" && <NoteScreen session={session} onNavigate={setScreen} />}
          {screen === "STATS" && <StatsScreen session={session} onNavigate={setScreen} />}
          {screen === "VACCINE" && <VaccineScreen session={session} onNavigate={setScreen} />}
          {screen === "DIARY" && <DiaryScreen session={session} onNavigate={setScreen} />}
          {screen === "ADMIN" && session.isAdmin && (
            <AdminScreen
              session={session}
              onNavigate={setScreen}
              onSessionUpdate={handleSessionUpdate}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
