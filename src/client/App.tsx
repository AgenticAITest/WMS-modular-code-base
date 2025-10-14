import styles from "./App.css";
import { router } from "@client/route";
import { RouterProvider } from "react-router";
import AuthProvider from "./provider/AuthProvider";
import ErrorBoundary from "./components/error/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./provider/ThemeProvider";
import { ModuleAuthorizationProvider } from "./hooks/useModuleAuthorization";

function App() {
  return (
    <ModuleAuthorizationProvider>
      <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
        <ErrorBoundary resetOnLocationChange={true}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
          <Toaster position="top-center"/>
        </ErrorBoundary>
      </ThemeProvider>
    </ModuleAuthorizationProvider>
  );
}

export default App;


