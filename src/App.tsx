import React from "react";
import "./App.css";
import { StageView } from "./views/StageView";
import { SideBarView } from "./views/SidebarView";
import { ConfigView } from "./views/ConfigView";

function App() {
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get("view") ?? "";
  console.log(viewParam);

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
