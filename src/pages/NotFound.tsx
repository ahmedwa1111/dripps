import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <MainLayout showFooter={false}>
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto text-center glass-card p-8">
          <h1 className="mb-4 text-5xl font-display font-bold">404</h1>
          <p className="mb-6 text-lg text-muted-foreground">Oops! Page not found.</p>
          <Link to="/">
            <Button variant="hero">Return to Home</Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default NotFound;
