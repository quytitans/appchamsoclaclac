interface Props {
  onGoHome: () => void;
}

export default function AppHeader({ onGoHome }: Props) {
  return (
    <button className="app-header" onClick={onGoHome}>
      <span className="app-header-logo">🍼</span>
      <span className="app-header-name">Trộm Vía Trộm Vía</span>
    </button>
  );
}
