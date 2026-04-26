import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/20 relative z-10">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-black text-primary">404</h1>
        <p className="text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary hover:text-primary/80 underline underline-offset-4 font-semibold">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
