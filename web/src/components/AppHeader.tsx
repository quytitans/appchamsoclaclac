interface Props {
  onGoHome: () => void;
}

export default function AppHeader({ onGoHome }: Props) {
  return (
    <button className="app-header" onClick={onGoHome}>
      <svg
        className="app-header-logo"
        width="20"
        height="24"
        viewBox="0 0 20 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="7.5" y="1.5" width="5" height="3" rx="1.5" stroke="white" strokeWidth="1.4" />
        <path d="M7.5 4.5 6 8.5h8L12.5 4.5" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
        <rect x="4.5" y="8.5" width="11" height="14" rx="4" stroke="white" strokeWidth="1.4" />
        <path d="M6.7 13h6.6M6.7 17h6.6" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span className="app-header-name">Trộm Vía Trộm Vía</span>
    </button>
  );
}
