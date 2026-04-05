import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Rescue from "./pages/Rescue";

export default function App() {
  const [page, setPage] = useState("overview");

  if (page === "rescue") {
    return <Rescue onOpenOverview={() => setPage("overview")} />;
  }

  return <Dashboard onOpenRescue={() => setPage("rescue")} />;
}
