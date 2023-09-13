/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { useEffect } from "react";
import { app, pages } from "@microsoft/teams-js";

export const ConfigView = () => {
  useEffect(() => {
    app.initialize().then(() => {
      pages.config.registerOnSaveHandler(onSavePagesConfig);
      pages.config.setValidityState(true);
      app.notifySuccess();
    });
  }, []);
  const onSavePagesConfig = async () => {
    await pages.config.setConfig({
      contentUrl: window.location.origin + "?inTeams=1&view=sideBar",
      websiteUrl: window.location.origin,
      suggestedDisplayName: "Live Share Canvas demo",
    });
  };

  return <div>This is the config page.</div>;
};
