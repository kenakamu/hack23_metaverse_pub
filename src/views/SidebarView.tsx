/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { app, meeting } from "@microsoft/teams-js";
import { useEffect } from "react";

export const SideBarView = () => {
  useEffect(() => {
    const initApp = async () => {
      await app.initialize();
      app.notifySuccess();
    };
    initApp();
  }, []);

  const onclickButton = () => {
    meeting.shareAppContentToStage((error, result) => {
      if (!error) {
        console.log("Started sharing to stage");
      } else {
        console.warn("shareAppContentToStage failed", error);
      }
    }, window.location.origin + "?inTeams=1&view=stage");
  };
  return (
    <div>
      <div>Welcome to the Live Share Canvas demo</div>
      <button onClick={onclickButton}>Share to Stage</button>
    </div>
  );
};
