import { useState } from "react";
import HomeScreen from "./screens/HomeScreen";
import NoteScreen from "./screens/NoteScreen";
import StatsScreen from "./screens/StatsScreen";
import PinLockScreen from "./screens/PinLockScreen";

export type Screen = "HOME" | "NOTE" | "STATS";

function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [screen, setScreen] = useState<Screen>("HOME");

  return (
    <div className="app">
      {!unlocked ? (
        <PinLockScreen onUnlock={() => setUnlocked(true)} />
      ) : (
        <>
          {screen === "HOME" && (
            <HomeScreen onNavigate={setScreen} onLogout={() => setUnlocked(false)} />
          )}
          {screen === "NOTE" && <NoteScreen onNavigate={setScreen} />}
          {screen === "STATS" && <StatsScreen onNavigate={setScreen} />}
        </>
      )}
    </div>
  );
}

export default App;
