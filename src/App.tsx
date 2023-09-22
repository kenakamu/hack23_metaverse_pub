import "./App.css";
import { StageView } from "./views/StageView";
import { SideBarView } from "./views/SidebarView";
import { ConfigView } from "./views/ConfigView";
import { useRef, useEffect } from "react";
import { app } from "@microsoft/teams-js";

const inTeams = new URL(window.location.href).searchParams.get("inTeams") === "1";

function App() {
  const initializeStartedRef = useRef(false);

  useEffect(() => {
    if (!inTeams || initializeStartedRef.current) return;
    initializeStartedRef.current = true;
    const initialize = async () => {
      try {
        console.log("App.tsx: initializing client SDK initialized");
        await app.initialize();
        app.notifyAppLoaded();
        app.notifySuccess();
      } catch (error) {
        console.error(error);
      }
    };
    console.log("App.tsx: initializing client SDK");
    //initialize();
  });
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get("view") ?? inTeams ? "stageview" : "stage";
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
    case "stageview":
    default:
      return (
        <div>
          <SideBarView />
        </div>
      );
  }
}

export default App;
