import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./AppShell";
import { LoginPage } from "./LoginPage";
import { DashboardPage } from "../features/orders/DashboardPage";
import { OrdersPage } from "../features/orders/OrdersPage";
import { PrintOrderPage } from "../features/orders/PrintOrderPage";
import { CustomersPage } from "../features/customers/CustomersPage";
import { RecipesPage } from "../features/recipes/RecipesPage";
import { IngredientsPage } from "../features/ingredients/IngredientsPage";
import { FinancePage } from "../features/finance/FinancePage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { useAppStore } from "../store/useAppStore";

export default function App() {
  const { loadAll, settings } = useAppStore();
  const [authenticated, setAuthenticated] = useState(
    () => localStorage.getItem("cc_auth") === "true"
  );

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (settings?.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings?.theme]);

  const auth = useMemo(
    () => ({
      authenticated,
      login: () => {
        localStorage.setItem("cc_auth", "true");
        setAuthenticated(true);
      },
      logout: () => {
        localStorage.removeItem("cc_auth");
        setAuthenticated(false);
      },
    }),
    [authenticated]
  );

  return (
    <Routes>
      <Route path="/login" element={<LoginPage auth={auth} />} />
      <Route
        path="/app"
        element={
          authenticated ? <AppShell auth={auth} /> : <Navigate to="/login" />
        }
      >
        <Route index element={<Navigate to="/app/dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/print/:id" element={<PrintOrderPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="ingredients" element={<IngredientsPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="settings" element={<SettingsPage auth={auth} />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/dashboard" />} />
    </Routes>
  );
}
