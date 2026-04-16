import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { TerminologyProvider } from "./terminology/TerminologyContext";
import { routes } from "./router";
import "./index.css";

const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TerminologyProvider>
      <RouterProvider router={router} />
    </TerminologyProvider>
  </StrictMode>,
);
