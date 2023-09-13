import "./App.css";
import { StageView } from "./StageView";
import { SideBarView } from "./SidebarView";
import { ConfigView } from "./ConfigView";
import { useRef, useState, useEffect } from "react";
import { app } from "@microsoft/teams-js";
import { StageViewWrapper } from "./StageViewWrapper";

function App() {
  const initializeStartedRef = useRef(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // This hook should only be called once, so we use a ref to track if it has been called.
    // This is a workaround for the fact that useEffect is called twice on initial render in React V18.
    // In production, you might consider using React Suspense if you are using React V18.
    // We are not doing this here because many customers are still using React V17.
    // We are monitoring the React Suspense situation closely and may revisit in the future.
    if (initializeStartedRef.current) return;
    initializeStartedRef.current = true;
    const initialize = async () => {
      try {
        console.log("App.js: initializing client SDK initialized");
        await app.initialize();
        app.notifyAppLoaded();
        app.notifySuccess();
        setInitialized(true);
      } catch (error) {
        console.error(error);
      }
    };
    console.log("App.js: initializing client SDK");
    initialize();
  });
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get("view") ?? "";
  if (initialized) {
    switch (viewParam.toLowerCase()) {
      case "sidebar":
        return (
          <div>
            <SideBarView />
          </div>
        );
      case "stage":
        return (
          <div>
            <StageViewWrapper />
          </div>
        );
      default:
        return (
          <div>
            <ConfigView />
          </div>
        );
        break;
    }
  } else {
    return <div></div>;
  }
}

export default App;
