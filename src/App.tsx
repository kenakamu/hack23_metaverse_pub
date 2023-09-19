import "./App.css";
import { StageView } from "./views/StageView";
import { SideBarView } from "./views/SidebarView";
import { ConfigView } from "./views/ConfigView";
import { useRef, useEffect } from "react";
import { app } from "@microsoft/teams-js";

const searchParams = new URL(window.location.href).searchParams;
const inTeams = searchParams.get("inTeams") === "1";

function App() {
  const initializeStartedRef = useRef(false);

  useEffect(() => {
    if (!inTeams) return;
    if (initializeStartedRef.current) return;
    initializeStartedRef.current = true;
    const initialize = async () => {
      try {
        console.log("App.js: initializing client SDK initialized");
        await app.initialize();
        app.notifyAppLoaded();
        app.notifySuccess();
      } catch (error) {
        console.error(error);
      }
    };
    console.log("App.js: initializing client SDK");
    initialize();
  });
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get("view") ?? "";
  switch (viewParam.toLowerCase()) {
    case "config":
      return (
        <div>
          <ConfigView />
        </div>
      );
    case "stage":
      return (
        <div>
          <StageView />
        </div>
      );
    default:
      return (
        <div>
          <SideBarView />
        </div>
      );
  }
}

export default App;
