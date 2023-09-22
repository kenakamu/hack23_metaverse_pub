/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { useEffect } from "react";
import { app, pages } from "@microsoft/teams-js";
// import { useNavigate } from "react-router-dom";

export const ConfigView = () => {
  useEffect(() => {
    const initApp = async () => {
      await app.initialize();
      app.notifySuccess();
      console.log("config!!");
    };
    initApp().then((item) => {
      pages.config.registerOnSaveHandler(onSavePagesConfig);
      pages.config.setValidityState(true);
    });
  }, []);
  const onSavePagesConfig = async (event: any) => {
    await pages.config.setConfig({
      contentUrl: window.location.origin + "?inTeams=1&view=sideBar",
      websiteUrl: window.location.origin,
      suggestedDisplayName: "Event Space Management",
    });
    event.notifySuccess();
  };

  return <div>This is the config page.</div>;
};
