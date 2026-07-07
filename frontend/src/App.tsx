import { useState, useEffect } from "react";
import { DashboardPage } from "./pages/DashboardPage";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem("rf_active_tab") || "overview";
  });

  const [businessId, setBusinessId] = useState<string>(() => {
    return localStorage.getItem("rf_business_id") || "b1111111-1111-1111-1111-111111111111";
  });

  useEffect(() => {
    localStorage.setItem("rf_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("rf_business_id", businessId);
  }, [businessId]);

  return (
    <DashboardPage
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      businessId={businessId}
      setBusinessId={setBusinessId}
    />
  );
}
