import { useRef, useState, useEffect } from "react";
import { LiveShareProvider } from "@microsoft/live-share-react";
import { LiveShareHost } from "@microsoft/teams-js";
import { StageView } from "./StageView";

export const StageViewWrapper = () => {
  const [host] = useState(LiveShareHost.create());
  return (
    <LiveShareProvider host={host} joinOnLoad>
      <StageView />
    </LiveShareProvider>
  );
};
