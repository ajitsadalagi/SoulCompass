import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ProductListing from "@/pages/product-listing";
import ProductSearch from "@/pages/product-search";
import ProfilePage from "@/pages/profile-page";
import AdminManagement from "@/pages/admin/management";
import UserManagementPage from "@/pages/admin/user-management";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthenticatedLayout } from "@/components/layouts/authenticated-layout";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        <AuthenticatedLayout>
          <HomePage />
        </AuthenticatedLayout>
      </Route>
      <Route path="/profile">
        <AuthenticatedLayout>
          <ProfilePage />
        </AuthenticatedLayout>
      </Route>
      <Route path="/list-product">
        <AuthenticatedLayout>
          <ProductListing />
        </AuthenticatedLayout>
      </Route>
      <Route path="/list-product/:id">
        <AuthenticatedLayout>
          <ProductListing />
        </AuthenticatedLayout>
      </Route>
      <Route path="/search">
        <AuthenticatedLayout>
          <ProductSearch />
        </AuthenticatedLayout>
      </Route>
      <Route path="/admin/management">
        <AuthenticatedLayout>
          <AdminManagement />
        </AuthenticatedLayout>
      </Route>
      <Route path="/admin/users">
        <AuthenticatedLayout>
          <UserManagementPage />
        </AuthenticatedLayout>
      </Route>
      <Route>
        <AuthenticatedLayout>
          <NotFound />
        </AuthenticatedLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;