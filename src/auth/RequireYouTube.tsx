import { useAuth } from "./AuthContext";

/**
 * Route guard: renders children only when the user has connected a YouTube channel.
 * Otherwise shows a prompt to connect.
 */
export default function RequireYouTube({ children }: { children: React.ReactNode }) {
  const { user, connectedToYouTube, loginWithGoogle } = useAuth();

  if (connectedToYouTube) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-border/60 bg-card/80 p-6 shadow-lg text-center space-y-4">
        <h2 className="text-lg font-semibold">Connect your YouTube channel</h2>
        <p className="text-sm text-muted-foreground">
          To host a quiz you need to link your YouTube channel.
          {user?.userEmail && (
            <span className="block mt-1 text-xs text-muted-foreground/60">
              Signed in as {user.userEmail}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => loginWithGoogle(window.location.pathname)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          Connect YouTube
        </button>
      </div>
    </div>
  );
}
