import React from "react";
import "./App.css";
import { StageView } from "./StageView";
import { SideBarView } from "./SidebarView";
import { ConfigView } from "./ConfigView";

function App() {
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get("view") ?? "";
  console.log(viewParam);
  let view;

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
      break;
  }
}

export default App;
